import { auth, currentUser } from "@clerk/nextjs/server";
import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { render } from "@react-email/render";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { BookingClubEmail } from "@/emails/booking-club";
import { BookingReceivedEmail } from "@/emails/booking-received";
import { formatClubDay, formatClubSlotRange, MAX_PLAYERS } from "@/lib/booking";
import { bookingUrl } from "@/lib/booking-links";
import { convexSessionToken } from "@/lib/convex-token";

/**
 * Avvisa che la richiesta di prenotazione è arrivata: al prenotante, ai
 * compagni che hanno lasciato la mail e in copia alla segreteria.
 *
 * Nessun QR qui: quello parte con la conferma della struttura
 * (modules/notifications/bookingMail.ts), ed è ciò che lo rende un segnale —
 * se ce l'hai, il campo è tuo.
 *
 * Gli indirizzi non arrivano dal browser ma da Convex, e solo a chi ha
 * organizzato quella partita: chiunque potrebbe chiamare questa route con un
 * `matchId` altrui, e sarebbe un modo comodo per spedire mail a nome del club.
 *
 * La prenotazione a questo punto esiste già: se le mail non partono, la
 * risposta lo dice ma non annulla niente — è il pattern delle altre route
 * (app/api/match-request/route.ts).
 */

const CLUB_INBOX = process.env.BOOKING_INBOX ?? "supporto@asdpadelsport.com";
const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";

const payloadSchema = z.object({
  matchId: z.string().min(1),
});

const LEVEL_LABELS = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzato: "Avanzato",
} as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Serve l'accesso." }, { status: 401 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("NEXT_PUBLIC_CONVEX_URL non configurata.");
    return NextResponse.json(
      { error: "Servizio non disponibile." },
      { status: 500 },
    );
  }

  // Stessa scelta che fa il browser fra token di sessione e template JWT
  // (vedi lib/convex-token.ts e convex/auth.config.ts).
  const token = await convexSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Sessione non valida per il backend." },
      { status: 401 },
    );
  }

  let booking: Awaited<ReturnType<typeof loadBooking>>;

  try {
    booking = await loadBooking(convexUrl, token, parsed.data.matchId);
  } catch (error) {
    console.error("Lettura della prenotazione fallita:", error);
    return NextResponse.json(
      { error: "Non riesco a leggere la prenotazione." },
      { status: 502 },
    );
  }

  if (!booking || !booking.code) {
    return NextResponse.json(
      { error: "Prenotazione non trovata." },
      { status: 404 },
    );
  }

  const code = booking.code;
  const user = await currentUser();
  const bookerEmail = user?.primaryEmailAddress?.emailAddress;

  const dayLabel = formatClubDay(booking.matchDate);
  const timeLabel = formatClubSlotRange(booking.matchDate);
  const levelLabel = LEVEL_LABELS[booking.level];
  const players = [
    ...booking.playerNames,
    ...booking.guests.map((g) => g.name),
  ];
  const missing = Math.max(0, MAX_PLAYERS - players.length);

  // Nessuna push allo staff da qui: l'avviso su Hark parte già alla creazione
  // della prenotazione (modules/openMatches/create.ts), e ripeterlo a ogni
  // mail vorrebbe dire due notifiche per la stessa partita.

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata: conferma non spedita.");
    return NextResponse.json({ code, notified: 0 });
  }

  try {
    const shared = {
      bookedBy: booking.bookedBy,
      dayLabel,
      timeLabel,
      court: booking.court,
      levelLabel,
      players,
      missing,
      code,
      bookingUrl: bookingUrl(code),
    };

    const recipients = [
      ...(bookerEmail
        ? [
            {
              email: bookerEmail,
              name: booking.bookedBy,
              isBooker: true,
            },
          ]
        : []),
      ...booking.guests
        .filter((guest): guest is { name: string; email: string } =>
          Boolean(guest.email),
        )
        .map((guest) => ({
          email: guest.email,
          name: guest.name,
          isBooker: false,
        })),
    ];

    const clubHtml = await render(
      BookingClubEmail({
        ...shared,
        phone: booking.phone,
        email: bookerEmail,
        notes: booking.notes,
      }),
    );

    const resend = new Resend(apiKey);

    const sends = await Promise.all([
      resend.emails.send({
        from: FROM,
        to: [CLUB_INBOX],
        replyTo: bookerEmail ?? CLUB_INBOX,
        subject: `Prenotazione dal sito: ${booking.bookedBy} — ${dayLabel}`,
        html: clubHtml,
      }),
      ...recipients.map(async (recipient) =>
        resend.emails.send({
          from: FROM,
          to: [recipient.email],
          replyTo: CLUB_INBOX,
          subject: `Richiesta ricevuta: ${dayLabel}, ${timeLabel}`,
          html: await render(
            BookingReceivedEmail({
              ...shared,
              recipientName: recipient.name,
              isBooker: recipient.isBooker,
            }),
          ),
        }),
      ),
    ]);

    const failed = sends.filter((result) => result.error);
    if (failed.length > 0) {
      // Una mail rifiutata non invalida le altre: lo segnaliamo e basta.
      console.error(
        "Conferme non spedite:",
        failed.map((result) => result.error),
      );
    }

    return NextResponse.json({
      code,
      notified: sends.length - failed.length,
    });
  } catch (error) {
    console.error("Invio della conferma fallito:", error);
    return NextResponse.json({ code, notified: 0 }, { status: 502 });
  }
}

function loadBooking(convexUrl: string, token: string, matchId: string) {
  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);

  return convex.query(api.modules.openMatches.recipients.default, {
    matchId: matchId as Id<"openMatches">,
  });
}
