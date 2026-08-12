import { z } from "zod";

/**
 * Contratto della richiesta di giocatori, condiviso fra il modulo e la route.
 *
 * Vive qui e non accanto al form perché la route lo rivalida lato server: la
 * validazione del client è comodità, non sicurezza.
 */

export const LEVELS = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzato", label: "Avanzato" },
] as const;

export const MISSING_PLAYERS = ["1", "2", "3"] as const;

/*
 * Fasce di gioco del club, ripetute qui e non importate da /book di proposito:
 * là descrivono la disponibilità reale dei campi, qui servono solo a tenere la
 * richiesta dentro orari sensati. Restano due elenchi separati perché possono
 * divergere — questo modulo non prenota niente.
 */
const PLAY_WINDOWS = [
  { start: "09:00", end: "12:30" },
  { start: "14:30", end: "21:30" },
] as const;

const SLOT_INTERVAL_MINUTES = 30;
const MATCH_DURATION_MINUTES = 90;

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Orari proponibili: uno ogni mezz'ora, purché il match ci stia dentro. */
export const MATCH_TIME_SLOTS = PLAY_WINDOWS.flatMap((window) => {
  const closing = toMinutes(window.end);
  const slots: string[] = [];

  for (
    let current = toMinutes(window.start);
    current + MATCH_DURATION_MINUTES <= closing;
    current += SLOT_INTERVAL_MINUTES
  ) {
    const hours = String(Math.floor(current / 60)).padStart(2, "0");
    const minutes = String(current % 60).padStart(2, "0");
    slots.push(`${hours}:${minutes}`);
  }

  return slots;
});

export const matchRequestSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il tuo nome."),
  email: z.email("Inserisci un indirizzo email valido."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s]{8,20}$/, "Inserisci un numero di telefono valido."),
  date: z.string().min(1, "Scegli una data."),
  time: z.string().min(1, "Scegli un orario."),
  level: z.enum(LEVELS.map((level) => level.value)),
  missing: z.enum(MISSING_PLAYERS),
  notes: z.string().trim().max(500).optional(),
});

export type MatchRequestValues = z.infer<typeof matchRequestSchema>;

export type MatchRequestLevel = MatchRequestValues["level"];

export function levelLabel(level: MatchRequestLevel) {
  return LEVELS.find((entry) => entry.value === level)?.label ?? level;
}

export function missingPlayersLabel(missing: number) {
  return missing === 1 ? "1 giocatore" : `${missing} giocatori`;
}

/**
 * Unisce data e ora del modulo in un timestamp.
 * Il modulo passa stringhe locali senza fuso (`YYYY-MM-DD` e `HH:mm`): `new
 * Date` su `YYYY-MM-DDTHH:mm` le interpreta nel fuso del browser, che è quello
 * che l'utente intende.
 */
export function toMatchTimestamp(date: string, time: string) {
  const timestamp = new Date(`${date}T${time}`).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

/** Data leggibile per le mail: sempre sul fuso del club, non su quello del server. */
export function formatMatchDate(timestamp: number) {
  return dateFormatter.format(new Date(timestamp));
}
