import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { CLUB_TIME_ZONE } from "../../utils/clubTime";
import {
  type Closure,
  closureOn,
  isWeekdayClosed,
  type OpeningWindow,
  windowsForDay,
} from "./schedule";

export type { Closure, OpeningWindow };

/**
 * Le regole di apertura, con i valori di partenza.
 *
 * I default riproducono gli orari storici del club, quelli che fino a ieri
 * stavano cablati nel codice: finché nessuno tocca la configurazione, il
 * comportamento è identico a prima.
 */

export interface BookingSettings {
  windows: OpeningWindow[];
  /** Giorni della settimana spenti, con le fasce conservate (schedule.ts). */
  closedWeekdays: number[];
  /** Chiusure per date (schedule.ts). */
  closures: Closure[];
  bookableDays: number;
  /** La prenotazione online richiede la tessera in corso (modules/clients). */
  membershipRequired: boolean;
  /** La partita privata va prenotata con tutti e quattro i giocatori. */
  fullSquadRequired: boolean;
  /** Il club offre il pagamento online (serve anche la chiave SumUp). */
  onlinePaymentsEnabled: boolean;
}

const DEFAULT_DAY_WINDOWS = [
  { start: "09:00", end: "12:30" },
  { start: "14:30", end: "21:30" },
];

export const DEFAULT_SETTINGS: BookingSettings = {
  windows: [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
    DEFAULT_DAY_WINDOWS.map((window) => ({ weekday, ...window })),
  ),
  closedWeekdays: [],
  closures: [],
  bookableDays: 7,
  // Spento: il controllo sulla tessera va acceso quando l'anagrafica è pronta.
  membershipRequired: false,
  // Spento: finché il club non lo chiede, si prenota anche in due e la squadra
  // la completa la struttura.
  fullSquadRequired: false,
  // Spento: si accende dal gestionale quando il club è pronto a incassare.
  onlinePaymentsEnabled: false,
};

export async function bookingSettings(ctx: QueryCtx): Promise<BookingSettings> {
  const row: Doc<"bookingSettings"> | null = await ctx.db
    .query("bookingSettings")
    .first();

  if (!row) return DEFAULT_SETTINGS;

  return {
    windows: row.windows,
    closedWeekdays: row.closedWeekdays ?? [],
    closures: row.closures ?? [],
    bookableDays: row.bookableDays,
    membershipRequired: row.membershipRequired ?? false,
    fullSquadRequired: row.fullSquadRequired ?? false,
    onlinePaymentsEnabled: row.onlinePaymentsEnabled ?? false,
  };
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Giorno della settimana e minuti dalla mezzanotte, nell'ora del club. */
export function clubMoment(timestamp: number): {
  weekday: number;
  minutes: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLUB_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(timestamp));

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return {
    weekday: weekdays.indexOf(value("weekday")),
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

/** Il giorno "AAAA-MM-GG" di un istante, nell'ora del club. */
export function clubDayKey(timestamp: number): string {
  // en-CA scrive le date come AAAA-MM-GG.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

/**
 * La partita ci sta dentro una fascia di apertura?
 *
 * Deve entrarci per intero: iniziare dieci minuti prima della chiusura non è
 * una prenotazione, è un problema per chi chiude. Un giorno chiuso (per date
 * o perché spento) non ha fasce.
 */
export function isWithinOpeningHours(
  settings: BookingSettings,
  start: number,
  durationMinutes: number,
): boolean {
  const { weekday, minutes } = clubMoment(start);
  const end = minutes + durationMinutes;

  return windowsForDay(settings, clubDayKey(start), weekday).some(
    (window) =>
      minutes >= toMinutes(window.start) && end <= toMinutes(window.end),
  );
}

const WEEKDAY_NAMES = [
  "la domenica",
  "il lunedì",
  "il martedì",
  "il mercoledì",
  "il giovedì",
  "il venerdì",
  "il sabato",
];

/**
 * Perché il club è chiuso quel giorno, detto a chi prova a prenotare:
 * «Il club è chiuso il 25 dicembre (Natale).» Nulla se il giorno è aperto,
 * e allora decidono le fasce (`isWithinOpeningHours`).
 */
export function closedReason(
  settings: BookingSettings,
  timestamp: number,
): string | null {
  const day = clubDayKey(timestamp);
  const closure = closureOn(settings, day);

  if (closure) {
    const [year, month, date] = day.split("-").map(Number);
    const label = new Intl.DateTimeFormat("it-IT", {
      timeZone: "UTC",
      day: "numeric",
      month: "long",
    }).format(new Date(Date.UTC(year, month - 1, date)));
    return `Il club è chiuso il ${label}${closure.reason ? ` (${closure.reason})` : ""}.`;
  }

  const { weekday } = clubMoment(timestamp);
  if (isWeekdayClosed(settings, weekday)) {
    return `Il club è chiuso ${WEEKDAY_NAMES[weekday]}.`;
  }

  return null;
}
