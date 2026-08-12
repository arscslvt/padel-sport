import { z } from "zod";

/**
 * Contratto dell'iscrizione a un evento, condiviso fra il modulo e la route.
 *
 * Come per `match-request.ts`: la validazione del client è comodità, la route
 * rivalida tutto: i campi con lo schema qui sotto, i limiti del modulo
 * (posti, scadenza, accompagnatori) rileggendoli da Sanity.
 */

/** Accompagnatori ammessi se il blocco non lo dice. Allineato al default Convex. */
export const DEFAULT_MAX_GUESTS = 3;

/** Tetto di sicurezza: oltre non si va nemmeno se il blocco chiede di più. */
export const MAX_GUESTS_LIMIT = 10;

export const eventRsvpSchema = z.object({
  slug: z.string().min(1),
  blockKey: z.string().min(1),
  name: z.string().trim().min(2, "Inserisci il tuo nome."),
  email: z.email("Inserisci un indirizzo email valido."),
  /**
   * Stringa e non numero perché arriva da una `<select>`: la conversione la fa
   * `guestsCount`, dopo che il range è stato verificato sul modulo di Sanity.
   */
  guests: z.string().regex(/^\d+$/, "Indica quante persone vengono con te."),
});

export type EventRsvpValues = z.infer<typeof eventRsvpSchema>;

export function guestsCount(guests: string) {
  const parsed = Number(guests);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

/** Quanti accompagnatori proporre nella tendina, entro il tetto di sicurezza. */
export function guestOptions(maxGuests?: number | null) {
  const max = Math.min(maxGuests ?? DEFAULT_MAX_GUESTS, MAX_GUESTS_LIMIT);
  return Array.from({ length: Math.max(max, 0) + 1 }, (_, index) => index);
}

export function guestsLabel(guests: number) {
  if (guests === 0) return "Vengo da solo";
  return guests === 1 ? "+1 persona" : `+${guests} persone`;
}

export function seatsLabel(seats: number) {
  return seats === 1 ? "1 posto" : `${seats} posti`;
}

/**
 * Sotto questa soglia il numero di iscritti non si mostra: «2 posti già
 * confermati» non è riprova sociale, è un evento vuoto detto ad alta voce.
 * Vale solo per gli eventi senza capienza — dove il tetto c'è, i posti rimasti
 * sono un'informazione che serve a chi legge, non un vanto.
 */
export const CONFIRMED_COUNT_THRESHOLD = 15;

export function showsConfirmedCount(seatsTaken: number) {
  return seatsTaken > CONFIRMED_COUNT_THRESHOLD;
}

/**
 * Pagina di conferma dell'annullamento. Il percorso vive qui perché lo
 * compone la route delle iscrizioni ma a servirlo è una pagina sotto
 * `app/(main)/events/[slug]/rsvp/annulla`: tenerli allineati a mano è il modo
 * migliore per scordarsene.
 */
export function rsvpCancelPath(slug: string, token: string) {
  return `/events/${slug}/rsvp/annulla?token=${encodeURIComponent(token)}`;
}

/** Le iscrizioni sono chiuse se l'editor ha messo una scadenza ed è passata. */
export function isRsvpClosed(closesAt?: string | null, now = Date.now()) {
  if (!closesAt) return false;

  const deadline = new Date(closesAt).getTime();
  return Number.isFinite(deadline) && deadline <= now;
}

const deadlineFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

/** Scadenza leggibile: sempre sul fuso del club, non su quello del server. */
export function formatRsvpDeadline(closesAt: string) {
  return deadlineFormatter.format(new Date(closesAt));
}
