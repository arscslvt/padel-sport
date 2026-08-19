import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { CLUB_TIME_ZONE } from "../../utils/clubTime";

/**
 * Le regole di apertura, con i valori di partenza.
 *
 * I default riproducono gli orari storici del club, quelli che fino a ieri
 * stavano cablati nel codice: finché nessuno tocca la configurazione, il
 * comportamento è identico a prima.
 */

export interface OpeningWindow {
  weekday: number;
  start: string;
  end: string;
}

export interface BookingSettings {
  windows: OpeningWindow[];
  bookableDays: number;
  /** La prenotazione online richiede la tessera in corso (modules/clients). */
  membershipRequired: boolean;
  /** La partita privata va prenotata con tutti e quattro i giocatori. */
  fullSquadRequired: boolean;
}

const DEFAULT_DAY_WINDOWS = [
  { start: "09:00", end: "12:30" },
  { start: "14:30", end: "21:30" },
];

export const DEFAULT_SETTINGS: BookingSettings = {
  windows: [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
    DEFAULT_DAY_WINDOWS.map((window) => ({ weekday, ...window })),
  ),
  bookableDays: 7,
  // Spento: il controllo sulla tessera va acceso quando l'anagrafica è pronta.
  membershipRequired: false,
  // Spento: finché il club non lo chiede, si prenota anche in due e la squadra
  // la completa la struttura.
  fullSquadRequired: false,
};

export async function bookingSettings(ctx: QueryCtx): Promise<BookingSettings> {
  const row: Doc<"bookingSettings"> | null = await ctx.db
    .query("bookingSettings")
    .first();

  if (!row) return DEFAULT_SETTINGS;

  return {
    windows: row.windows,
    bookableDays: row.bookableDays,
    membershipRequired: row.membershipRequired ?? false,
    fullSquadRequired: row.fullSquadRequired ?? false,
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

/**
 * La partita ci sta dentro una fascia di apertura?
 *
 * Deve entrarci per intero: iniziare dieci minuti prima della chiusura non è
 * una prenotazione, è un problema per chi chiude.
 */
export function isWithinOpeningHours(
  settings: BookingSettings,
  start: number,
  durationMinutes: number,
): boolean {
  const { weekday, minutes } = clubMoment(start);
  const end = minutes + durationMinutes;

  return settings.windows.some(
    (window) =>
      window.weekday === weekday &&
      minutes >= toMinutes(window.start) &&
      end <= toMinutes(window.end),
  );
}
