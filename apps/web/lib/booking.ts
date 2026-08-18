/**
 * Regole del flusso di prenotazione del sito.
 *
 * Durata della partita e passo degli slot restano costanti — sono la forma del
 * gioco, non una scelta gestionale. Giorni prenotabili e fasce di apertura
 * invece arrivano da Convex (`modules/settings`), dove li muove la struttura
 * dalla dashboard: qui restano solo i valori di ripiego, usati finché la
 * configurazione non è stata letta.
 *
 * Le stesse regole valgono per l'app (apps/mobile/lib/booking.ts), che però ha
 * ancora le fasce cablate: finché non legge anche lei la configurazione, un
 * orario cambiato qui va allineato là a mano.
 */

export const SLOT_INTERVAL_MINUTES = 30;
export const MATCH_DURATION_MINUTES = 90;
export const MAX_PLAYERS = 4;

/** Giorni selezionabili quando la configurazione non è ancora arrivata. */
export const BOOKABLE_DAYS = 7;

export interface OpeningWindow {
  /** `0` = domenica, come `Date#getDay`. */
  weekday: number;
  start: string;
  end: string;
}

/** Orari storici del club: valgono finché nessuno li cambia in dashboard. */
export const DEFAULT_WINDOWS: OpeningWindow[] = [0, 1, 2, 3, 4, 5, 6].flatMap(
  (weekday) => [
    { weekday, start: "09:00", end: "12:30" },
    { weekday, start: "14:30", end: "21:30" },
  ],
);

export const MATCH_DURATION_MS = MATCH_DURATION_MINUTES * 60 * 1000;

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*                                   Giorni                                   */
/* -------------------------------------------------------------------------- */

export interface BookingDay {
  /** Mezzanotte del giorno: base per comporre il timestamp della partita. */
  date: Date;
  /** "Oggi", "Domani" o il giorno della settimana abbreviato. */
  label: string;
  /** Numero del giorno nel mese. */
  dayNumber: string;
}

/** I giorni prenotabili a partire da oggi. */
export function bookableDays(
  days: number = BOOKABLE_DAYS,
  from: Date = new Date(),
): BookingDay[] {
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(from);
    date.setDate(date.getDate() + offset);
    date.setHours(0, 0, 0, 0);

    const weekday = date.toLocaleDateString("it-IT", { weekday: "short" });
    const label =
      offset === 0 ? "Oggi" : offset === 1 ? "Domani" : capitalize(weekday);

    return { date, label, dayNumber: String(date.getDate()) };
  });
}

/* -------------------------------------------------------------------------- */
/*                                    Orari                                   */
/* -------------------------------------------------------------------------- */

export interface TimeSlot {
  /** Orario di inizio, es. "18:30". */
  time: string;
  /** Minuti dalla mezzanotte: per ordinare, filtrare e raggruppare. */
  minutes: number;
}

/** Gli orari di inizio possibili in una giornata, viste le sue fasce. */
export function dailySlots(
  windows: readonly OpeningWindow[],
  weekday: number,
): TimeSlot[] {
  return windows
    .filter((window) => window.weekday === weekday)
    .flatMap((window) => {
      const slots: TimeSlot[] = [];
      const closing = toMinutes(window.end);

      for (
        let minutes = toMinutes(window.start);
        minutes + MATCH_DURATION_MINUTES <= closing;
        minutes += SLOT_INTERVAL_MINUTES
      ) {
        slots.push({ time: toTime(minutes), minutes });
      }

      return slots;
    })
    .sort((a, b) => a.minutes - b.minutes);
}

/**
 * Orari ancora selezionabili in un giorno: oggi escludiamo quelli già passati,
 * che il backend rifiuterebbe comunque.
 */
export function availableSlots(
  day: Date,
  windows: readonly OpeningWindow[] = DEFAULT_WINDOWS,
  now: Date = new Date(),
): TimeSlot[] {
  const slots = dailySlots(windows, day.getDay());

  if (day.toDateString() !== now.toDateString()) return slots;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((slot) => slot.minutes > nowMinutes);
}

export interface SlotGroup {
  title: string;
  slots: TimeSlot[];
}

/** Limiti (esclusi) delle fasce orarie usate per raggruppare gli slot. */
const SLOT_GROUPS = [
  { title: "Mattina", until: 13 * 60 },
  { title: "Pomeriggio", until: 18 * 60 },
  { title: "Sera", until: 24 * 60 },
];

/** Raggruppa gli orari in mattina/pomeriggio/sera, saltando i gruppi vuoti. */
export function groupSlots(slots: TimeSlot[]): SlotGroup[] {
  return SLOT_GROUPS.map(({ title, until }, index) => ({
    title,
    slots: slots.filter(
      (slot) =>
        slot.minutes < until &&
        slot.minutes >= (SLOT_GROUPS[index - 1]?.until ?? 0),
    ),
  })).filter((group) => group.slots.length > 0);
}

/** Timestamp di inizio partita dal giorno e dall'orario scelti. */
export function combineDateAndTime(day: Date, time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

/**
 * Occupazione dei campi in una finestra di 90 minuti a partire da `start`.
 * Una prenotazione senza campo assegnato (righe vecchie) li blocca tutti.
 */
export interface CourtBusy {
  bookingDate: number;
  slot?: string | null;
}

export function overlappingBookings(
  bookings: readonly CourtBusy[],
  start: number,
): CourtBusy[] {
  const end = start + MATCH_DURATION_MS;

  return bookings.filter((booking) => {
    const bookingEnd = booking.bookingDate + MATCH_DURATION_MS;
    return booking.bookingDate < end && bookingEnd > start;
  });
}

/**
 * Occupazioni che non nascono da noi: gli appuntamenti presi su SumUp, che
 * arrivano dal calendario condiviso con i loro orari di inizio e fine.
 *
 * Contano separatamente dalle prenotazioni perché ne tolgono *uno* di campo:
 * il calendario di SumUp è unico, quindi non sappiamo su quale campo siano.
 */
export interface CourtBlock {
  start: number;
  end: number;
}

export function overlappingBlocks(
  blocks: readonly CourtBlock[],
  start: number,
): CourtBlock[] {
  const end = start + MATCH_DURATION_MS;

  return blocks.filter((block) => block.start < end && block.end > start);
}

/**
 * Fuso del club. Le prenotazioni sono timestamp assoluti, ma vanno lette
 * sempre con l'orologio di Melilli: il server di Vercel gira su UTC e la mail
 * di conferma direbbe l'orario sbagliato, e chi apre la pagina da un altro
 * fuso vedrebbe un'ora che non esiste in campo.
 */
export const CLUB_TIME_ZONE = "Europe/Rome";

/** "Lunedì 3 agosto" nell'ora del club, da un timestamp. */
export function formatClubDay(timestamp: number): string {
  return capitalize(
    new Date(timestamp).toLocaleDateString("it-IT", {
      timeZone: CLUB_TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );
}

const clubTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("it-IT", {
    timeZone: CLUB_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });

/** "18:30 – 20:00" nell'ora del club, da un timestamp di inizio. */
export function formatClubSlotRange(timestamp: number): string {
  return `${clubTime(timestamp)} – ${clubTime(timestamp + MATCH_DURATION_MS)}`;
}

/** "Lunedì 3 agosto", per il riepilogo. */
export function formatDayLong(date: Date): string {
  return capitalize(
    date.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );
}

/** "18:30 – 20:00": inizio e fine della partita. */
export function formatSlotRange(time: string): string {
  return `${time} – ${toTime(toMinutes(time) + MATCH_DURATION_MINUTES)}`;
}

/** "1h 30m": durata leggibile di una partita. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours > 0 ? `${hours}h` : null, rest > 0 ? `${rest}m` : null]
    .filter(Boolean)
    .join(" ");
}
