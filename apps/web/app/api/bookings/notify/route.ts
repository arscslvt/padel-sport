import { clerkClient } from "@clerk/nextjs/server";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { BookingAcceptedEmail } from "@/emails/booking-accepted";
import { BookingCancelledEmail } from "@/emails/booking-cancelled";
import { BookingMergedEmail } from "@/emails/booking-merged";
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
  guests: z.array(z.object({ name: z.string(), email: z.email() })),
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
  ]),
});

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

  // L'indirizzo di chi ha prenotato vive su Clerk: Convex ne conosce solo l'id.
  let bookerEmail: string | undefined;
  if (booking.bookerClerkUserId) {
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(booking.bookerClerkUserId);
      bookerEmail = user.primaryEmailAddress?.emailAddress;
    } catch (error) {
      console.error("Email di chi ha prenotato non recuperata:", error);
    }
  }

  const recipients = [
    ...(bookerEmail
      ? [{ email: bookerEmail, name: booking.bookedBy, isBooker: true }]
      : []),
    ...booking.guests.map((guest) => ({
      email: guest.email,
      name: guest.name,
      isBooker: false,
    })),
  ];

  if (recipients.length === 0) {
    return NextResponse.json({ notified: 0 });
  }

  if (booking.kind === "accepted" && !booking.code) {
    console.error("Conferma senza codice: QR non generabile.");
    return NextResponse.json({ error: "Codice mancante." }, { status: 400 });
  }

  // L'unione senza l'altro gruppo non è una notizia: può succedere se quello
  // ha disdetto nel frattempo. Meglio nessuna mail che una mail sbagliata.
  if (booking.kind === "merged" && !booking.partner) {
    console.warn("Unione senza l'altra prenotazione: mail non inviata.");
    return NextResponse.json({ notified: 0 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata: disdetta non comunicata.");
    return NextResponse.json({ notified: 0 });
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
                isBooker: recipient.isBooker,
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

        if (booking.kind === "merged" && booking.partner) {
          return {
            from: FROM,
            to: [recipient.email],
            replyTo: CLUB_INBOX,
            subject: `Campo completo: ${dayLabel}, ${timeLabel}`,
            html: await render(
              BookingMergedEmail({
                recipientName: recipient.name,
                isBooker: recipient.isBooker,
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
              isBooker: recipient.isBooker,
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

    return NextResponse.json({ notified: sends.length - failed.length });
  } catch (error) {
    console.error("Mail della prenotazione non inviate:", error);
    return NextResponse.json({ notified: 0 }, { status: 502 });
  }
}
