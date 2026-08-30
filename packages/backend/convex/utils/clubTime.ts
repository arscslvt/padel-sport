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

/**
 * Il giorno di calendario del club, come `YYYY-MM-DD`.
 *
 * Serve alle chiavi che valgono una volta al giorno — la storia dei campi
 * liberi, il consiglio, il riepilogo di una giornata di torneo. Prenderlo da
 * `toISOString().slice(0, 10)`, che è la scorciatoia ovvia, dà il giorno in
 * UTC: fra mezzanotte e le due di un sabato d'estate quella data è ancora
 * venerdì, e la stessa storia verrebbe pubblicata due volte a distanza di
 * un'ora senza che nulla segnali l'errore.
 *
 * L'ordinamento alfabetico coincide con quello cronologico, che è la ragione
 * per cui il formato è questo e non quello italiano.
 */
export function clubDay(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(timestamp));

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Solo l'orario, "09:30", nell'ora del club. */
export function clubTimeOfDay(timestamp: number): string {
  const parts = clubParts(timestamp);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("hour")}:${value("minute")}`;
}

/**
 * La data per esteso, "domenica 30 agosto", nell'ora del club.
 *
 * Per ciò che dura un giorno intero — le fasce libere di domani, una giornata
 * di torneo — l'orario non è un dettaglio in più: è rumore che sposta
 * l'attenzione su un istante che non significa niente.
 */
export function clubDateLong(timestamp: number): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: CLUB_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(timestamp));
}
