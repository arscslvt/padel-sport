/**
 * L'ora della struttura, ovunque venga scritta per un essere umano.
 *
 * Le prenotazioni sono timestamp assoluti, ma le funzioni Convex girano su UTC:
 * `toLocaleString("it-IT")` e il `format` di date-fns, senza fuso esplicito,
 * raccontano un orario che in campo non esiste — d'estate due ore prima, in
 * inverno una. È il motivo per cui una partita delle 15:00 è arrivata su
 * WhatsApp come «alle 13:00» mentre mail e sito, che il fuso lo dichiarano,
 * davano l'orario giusto.
 *
 * Da qui passa qualunque data destinata a un messaggio: WhatsApp, avvisi Hark
 * allo staff, righe di log leggibili.
 */

export const CLUB_TIME_ZONE = "Europe/Rome";

const clubParts = (timestamp: number) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: CLUB_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    // Esplicito: senza, la mezzanotte in italiano diventa «24:00».
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));

/**
 * "19/08/2026, 15:00" nell'ora del club, o "19/08/2026 alle 15:00" con l'altro
 * separatore: il template WhatsApp approvato su Twilio vuole la forma
 * discorsiva, gli avvisi allo staff la virgola secca di `toLocaleString`.
 */
export function formatClubDateTime(
  timestamp: number,
  separator = ", ",
): string {
  const parts = clubParts(timestamp);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("day")}/${value("month")}/${value("year")}${separator}${value("hour")}:${value("minute")}`;
}
