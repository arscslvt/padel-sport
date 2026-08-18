import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

import { bookingCalendarEvent } from "@/lib/booking-calendar";
import { buildICS } from "@/lib/calendar";

/**
 * La prenotazione come appuntamento da salvare in agenda.
 *
 * Gemella di `events/[slug]/ics`: stesso formato, stesso `Content-Disposition`
 * ad allegato, che è ciò che fa aprire il calendario di sistema invece di
 * mostrare il file come testo.
 *
 * Sta dietro al codice e basta, come la pagina che la ospita: chi ha il codice
 * ha già tutto, e chiedere una sessione qui vorrebbe dire negare l'agenda ai
 * compagni di squadra, che un account non ce l'hanno.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("NEXT_PUBLIC_CONVEX_URL non configurata.");
    return new Response("Servizio non disponibile", { status: 500 });
  }

  const convex = new ConvexHttpClient(convexUrl);
  const booking = await convex.query(api.bookings.getByCode.default, {
    code: normalized,
  });

  if (!booking || !booking.code || booking.status === "cancelled") {
    return new Response("Prenotazione non trovata", { status: 404 });
  }

  const ics = buildICS(
    bookingCalendarEvent({
      code: booking.code,
      bookingDate: booking.bookingDate,
      court: booking.court,
    }),
    `prenotazione-${booking.code}@asdpadelsport.com`,
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="prenotazione-${booking.code}.ics"`,
    },
  });
}
