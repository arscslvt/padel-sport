import { clerkClient } from "@clerk/nextjs/server";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { BookingAcceptedEmail } from "@/emails/booking-accepted";
import { BookingCancelledEmail } from "@/emails/booking-cancelled";
import { BookingMergedEmail } from "@/emails/booking-merged";
import { BookingRescheduledEmail } from "@/emails/booking-rescheduled";
import { formatClubDay, formatClubSlotRange, MAX_PLAYERS } from "@/lib/booking";
import { bookingQrPngUrl, bookingUrl, SITE_URL } from "@/lib/booking-links";
import { bookingQrPng } from "@/lib/booking-qr";
import { getInfo } from "@/lib/info";
import { BOOKING_LINK } from "@/lib/links";

/**
 * Avvisa di quello che succede a una prenotazione dopo che è stata creata:
 * la struttura l'ha confermata, oppure è stata annullata.
 *
 * La chiama Convex, non il browser: i destinatari includono le mail degli
 * ospiti, che nessuna query pubblica espone. Chi annulla dalla dashboard è la
 * struttura, e non avrebbe titolo per leggerle nemmeno lei.
 *
 * L'autenticazione è un segreto condiviso con il deployment Convex: qui non
 * arriva nessuna sessione utente, perché la disdetta può partire anche da un
 * cron o dall'app.
 *
 * La risposta dice com'è andata destinatario per destinatario (`results`):
 * l'id che Resend assegna a ogni mail torna a Convex, che lo scrive nel
 * registro degli avvisi e ci aggancia i webhook di consegna
 * (modules/notifications/bookingMail.ts).
 */

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const CLUB_INBOX = process.env.BOOKING_INBOX ?? "supporto@asdpadelsport.com";

const payloadSchema = z.object({
  code: z.string().optional(),
  start: z.number(),
  end: z.number(),
  court: z.string().optional(),
  bookedBy: z.string(),
  players: z.array(z.string()),
  bookerClerkUserId: z.string().optional(),
  /** L'indirizzo in anagrafica, per chi non ha un account. */
  bookerEmail: z.string().optional(),
  guests: z.array(z.object({ name: z.string(), email: z.email() })),
  /**
   * I giocatori veri della prenotazione, oltre a chi l'ha presa: i clienti
   * collegati dallo staff o chi è in partita. L'indirizzo si risolve da Clerk
   * quando c'è un account, se no vale la copia in anagrafica.
   */
  playerRecipients: z
    .array(
      z.object({
        playerId: z.string(),
        name: z.string(),
        email: z.string().optional(),
        clerkUserId: z.string().optional(),
      }),
    )
    .optional(),
  /**
   * La mail non è per chi ha prenotato (l'ha già avuta): va solo ai giocatori
   * appena entrati, o a chi lo staff la sta rimandando.
   */
  bookerExcluded: z.boolean().optional(),
  /** Il gruppo con cui si divide il campo, quando la struttura ha unito due prenotazioni. */
  partner: z
    .object({ bookedBy: z.string(), players: z.array(z.string()) })
    .optional(),
  accepted: z.boolean().optional(),
  kind: z.union([
    z.literal("accepted"),
    z.literal("merged"),
    z.literal("cancelled_by_club"),
    z.literal("cancelled_by_player"),
    z.literal("rescheduled"),
  ]),
  /** Con `rescheduled`: l'orario di prima, per dire cosa cambia. */
  previousStart: z.number().optional(),
});

type DeliveryResult = {
  role: "booker" | "player" | "guest";
  playerId?: string;
  name?: string;
  email?: string;
  id?: string;
  error?: string;
  skipped?: string;
};

const NO_ADDRESS = "Nessun indirizzo email";

export async function POST(request: Request) {
  const secret = process.env.BOOKING_WEBHOOK_SECRET;

  if (!secret) {
    console.error("BOOKING_WEBHOOK_SECRET non configurata.");
    return NextResponse.json(
      { error: "Servizio non disponibile." },
      { status: 500 },
    );
  }

  if (request.headers.get("x-booking-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const booking = parsed.data;

  // L'indirizzo di chi ha prenotato vive su Clerk quando c'è un account; senza,
  // vale la copia in anagrafica che arriva da Convex.
  let bookerEmail: string | undefined = booking.bookerEmail;
  if (booking.bookerClerkUserId) {
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(booking.bookerClerkUserId);
      bookerEmail = user.primaryEmailAddress?.emailAddress ?? bookerEmail;
    } catch (error) {
      console.error("Email di chi ha prenotato non recuperata:", error);
    }
  }

  // Lo stesso per i giocatori, con una sola chiamata a Clerk per tutti.
  const players = booking.playerRecipients ?? [];
  const clerkEmails = new Map<string, string>();
  const clerkIds = players.flatMap((player) =>
    player.clerkUserId ? [player.clerkUserId] : [],
  );
  if (clerkIds.length > 0) {
    try {
      const clerk = await clerkClient();
      const { data } = await clerk.users.getUserList({
        userId: clerkIds,
        limit: clerkIds.length,
      });
      for (const user of data) {
        const address = user.primaryEmailAddress?.emailAddress;
        if (address) clerkEmails.set(user.id, address);
      }
    } catch (error) {
      console.error("Email dei giocatori non recuperate:", error);
    }
  }

  type Recipient = {
    email: string;
    name: string;
    role: DeliveryResult["role"];
    playerId?: string;
  };

  // Una persona sola riceve una mail sola, anche se compare due volte: il
  // compagno collegato dallo staff che aveva lasciato anche la mail da ospite.
  const recipients: Recipient[] = [];
  const seen = new Set<string>();
  const add = (recipient: Recipient) => {
    const key = recipient.email.trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    recipients.push(recipient);
  };

  if (bookerEmail) {
    add({ email: bookerEmail, name: booking.bookedBy, role: "booker" });
  }

  // Chi ha prenotato o un giocatore senza un indirizzo è un'informazione per
  // lo staff, non un errore: la scheda lo mostra come avviso non partito.
  const missing: DeliveryResult[] =
    bookerEmail || booking.bookerExcluded
      ? []
      : [{ role: "booker", skipped: NO_ADDRESS }];

  for (const player of players) {
    const email =
      (player.clerkUserId && clerkEmails.get(player.clerkUserId)) ||
      player.email;
    if (email) {
      add({
        email,
        name: player.name,
        role: "player",
        playerId: player.playerId,
      });
    } else {
      missing.push({
        role: "player",
        playerId: player.playerId,
        name: player.name,
        skipped: NO_ADDRESS,
      });
    }
  }

  for (const guest of booking.guests) {
    add({ email: guest.email, name: guest.name, role: "guest" });
  }

  /** Chi era, per la riga del registro. */
  const targetOf = (recipient: Recipient): DeliveryResult => ({
    role: recipient.role,
    email: recipient.email,
    ...(recipient.role === "booker"
      ? {}
      : { playerId: recipient.playerId, name: recipient.name }),
  });

  if (recipients.length === 0) {
    return NextResponse.json({ notified: 0, results: missing });
  }

  if (booking.kind === "accepted" && !booking.code) {
    console.error("Conferma senza codice: QR non generabile.");
    return NextResponse.json({ error: "Codice mancante." }, { status: 400 });
  }

  if (booking.kind === "rescheduled" && booking.previousStart === undefined) {
    console.error("Cambio d'orario senza l'orario di prima: mail non inviata.");
    return NextResponse.json(
      { error: "Orario precedente mancante." },
      { status: 400 },
    );
  }

  // L'unione senza l'altro gruppo non è una notizia: può succedere se quello
  // ha disdetto nel frattempo. Meglio nessuna mail che una mail sbagliata.
  if (booking.kind === "merged" && !booking.partner) {
    console.warn("Unione senza l'altra prenotazione: mail non inviata.");
    return NextResponse.json({ notified: 0, results: [] });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata: disdetta non comunicata.");
    return NextResponse.json({
      notified: 0,
      results: recipients.map(
        (recipient): DeliveryResult => ({
          ...targetOf(recipient),
          error: "Invio delle mail non configurato",
        }),
      ),
    });
  }

  const dayLabel = formatClubDay(booking.start);
  const timeLabel = formatClubSlotRange(booking.start);

  // A campo unito la squadra è la somma dei due gruppi: contare solo i propri
  // giocatori direbbe «mancano due» a un campo pieno.
  const team = [...booking.players, ...(booking.partner?.players ?? [])];

  try {
    const resend = new Resend(apiKey);

    const messages = await Promise.all(
      recipients.map(async (recipient) => {
        if (booking.kind === "accepted") {
          // Solo la conferma porta il QR, quindi solo qui serve l'allegato:
          // e l'invio in blocco di Resend non li accetta.
          return {
            from: FROM,
            to: [recipient.email],
            replyTo: CLUB_INBOX,
            subject: `Campo confermato: ${dayLabel}, ${timeLabel}`,
            html: await render(
              BookingAcceptedEmail({
                recipientName: recipient.name,
                isBooker: recipient.role === "booker",
                bookedBy: booking.bookedBy,
                dayLabel,
                timeLabel,
                court: booking.court,
                players: team,
                missing: Math.max(0, MAX_PLAYERS - team.length),
                code: booking.code as string,
                qrUrl: bookingQrPngUrl(booking.code as string),
                bookingUrl: bookingUrl(booking.code as string),
              }),
            ),
            attachments: [
              {
                filename: `prenotazione-${booking.code}.png`,
                content: (await bookingQrPng(booking.code as string)).toString(
                  "base64",
                ),
              },
            ],
          };
        }

        if (
          booking.kind === "rescheduled" &&
          booking.previousStart !== undefined
        ) {
          return {
            from: FROM,
            to: [recipient.email],
            replyTo: CLUB_INBOX,
            subject: `Nuovo orario per la partita di ${dayLabel.charAt(0).toLowerCase()}${dayLabel.slice(1)}`,
            html: await render(
              BookingRescheduledEmail({
                recipientName: recipient.name,
                isBooker: recipient.role === "booker",
                bookedBy: booking.bookedBy,
                dayLabel,
                timeLabel,
                previousTimeLabel: formatClubSlotRange(booking.previousStart),
                court: booking.court,
                accepted: booking.accepted ?? false,
                bookingUrl: booking.code
                  ? bookingUrl(booking.code)
                  : `${SITE_URL}${BOOKING_LINK}`,
                phone: getInfo("cell") ?? "",
              }),
            ),
          };
        }

        if (booking.kind === "merged" && booking.partner) {
          return {
            from: FROM,
            to: [recipient.email],
            replyTo: CLUB_INBOX,
            subject: `Campo completo: ${dayLabel}, ${timeLabel}`,
            html: await render(
              BookingMergedEmail({
                recipientName: recipient.name,
                isBooker: recipient.role === "booker",
                bookedBy: booking.bookedBy,
                dayLabel,
                timeLabel,
                court: booking.court,
                players: booking.players,
                partnerBookedBy: booking.partner.bookedBy,
                partnerPlayers: booking.partner.players,
                accepted: booking.accepted ?? false,
                bookingUrl: booking.code
                  ? bookingUrl(booking.code)
                  : `${SITE_URL}${BOOKING_LINK}`,
              }),
            ),
          };
        }

        return {
          from: FROM,
          to: [recipient.email],
          replyTo: CLUB_INBOX,
          subject: `Prenotazione annullata: ${dayLabel}, ${timeLabel}`,
          html: await render(
            BookingCancelledEmail({
              recipientName: recipient.name,
              isBooker: recipient.role === "booker",
              by: booking.kind === "cancelled_by_club" ? "club" : "player",
              bookedBy: booking.bookedBy,
              dayLabel,
              timeLabel,
              court: booking.court,
              bookingUrl: `${SITE_URL}${BOOKING_LINK}`,
              phone: getInfo("cell") ?? "",
            }),
          ),
        };
      }),
    );

    const sends = await Promise.all(
      messages.map((message) => resend.emails.send(message)),
    );

    const failed = sends.filter((result) => result.error);
    if (failed.length > 0) {
      console.error(
        "Mail della prenotazione non spedite:",
        failed.map((result) => result.error),
      );
    }

    // `sends` è nello stesso ordine di `recipients`: Promise.all lo conserva.
    const results: DeliveryResult[] = [
      ...missing,
      ...recipients.map((recipient, index): DeliveryResult => {
        const send = sends[index];
        return {
          ...targetOf(recipient),
          id: send.data?.id,
          error: send.error ? send.error.message : undefined,
        };
      }),
    ];

    return NextResponse.json({
      notified: sends.length - failed.length,
      results,
    });
  } catch (error) {
    console.error("Mail della prenotazione non inviate:", error);
    return NextResponse.json(
      { notified: 0, error: "Invio delle mail non riuscito." },
      { status: 502 },
    );
  }
}
