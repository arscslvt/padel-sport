import { MATCH_DURATION_MS } from "@/lib/booking";
import { bookingUrl } from "@/lib/booking-links";
import type { CalendarEvent } from "@/lib/calendar";

/**
 * La prenotazione vista dal calendario.
 *
 * Sta in un posto solo perché la usano in tre: la schermata di conferma, la
 * pagina pubblica della prenotazione e la route che serve il file .ics. Se le
 * tre versioni divergessero, chi salva l'appuntamento da posti diversi si
 * ritroverebbe eventi diversi in agenda.
 */
export function bookingCalendarEvent(booking: {
  code: string;
  bookingDate: number;
  court?: string;
}): CalendarEvent {
  const start = new Date(booking.bookingDate);
  const end = new Date(booking.bookingDate + MATCH_DURATION_MS);

  const details = [
    `Codice prenotazione ${booking.code}`,
    booking.court,
    "Mostra il QR all'ingresso.",
  ].filter(Boolean);

  return {
    title: "Partita di padel",
    description: details.join(" · "),
    dateStart: start.toISOString(),
    dateEnd: end.toISOString(),
    url: bookingUrl(booking.code),
  };
}
