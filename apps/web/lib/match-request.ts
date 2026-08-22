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

export type MissingPlayers = (typeof MISSING_PLAYERS)[number];

/*
 * Gli orari proponibili non stanno più qui: erano una copia delle fasce del
 * club, scollegata dai campi davvero liberi, e capitava di chiedere giocatori
 * per un orario in cui non c'era più campo. Ora il modulo legge la stessa
 * disponibilità di /book (hooks/use-court-availability.ts). Restano stringhe
 * `HH:mm`: la richiesta continua a non prenotare niente.
 */

export const matchRequestSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il tuo nome."),
  email: z.email("Inserisci un indirizzo email valido."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s]{8,20}$/, "Inserisci un numero di telefono valido."),
  date: z.string().min(1, "Scegli una data."),
  time: z.string().min(1, "Scegli un orario."),
  level: z.enum(
    LEVELS.map((level) => level.value),
    { message: "Scegli il livello di gioco." },
  ),
  missing: z.enum(MISSING_PLAYERS, {
    message: "Scegli quanti giocatori cerchi.",
  }),
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
