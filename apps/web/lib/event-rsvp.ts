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

/**
 * Ricerca sugli iscritti, condivisa dalle due liste della dashboard.
 *
 * Gli accenti si appiattiscono prima del confronto: «Nicolo» deve trovare
 * «Niccolò». Alla cassa si cerca in piedi, col dito, su una tastiera del
 * telefono — e chi digita non ha voglia di tenere premuta la «o» per
 * assomigliare a com'è scritto in banca dati.
 *
 * I termini si intersecano invece di sommarsi, come in `searchEvents`: «mario
 * rossi» deve restringere, non allargare a tutti i Mario e tutti i Rossi.
 *
 * Generica sulla forma minima che le serve, così vale sia per le righe
 * dell'elenco iscritti sia per quelle degli arrivi senza tirarsi dietro i tipi
 * generati da Convex.
 */
export function searchRsvps<T extends { name: string; email: string }>(
  entries: T[],
  query: string,
): T[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return entries;

  return entries.filter((entry) => {
    const haystack = fold(`${entry.name} ${entry.email}`);
    return terms.every((term) => haystack.includes(term));
  });
}

function fold(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * I due ordini possibili per un elenco di iscritti.
 *
 * `signup` è l'ordine in cui si sono iscritti, `name` l'alfabetico sul nome.
 * Servono tutti e due: l'ordine di iscrizione racconta come si è riempito
 * l'evento, ma alla cassa arriva una persona che dice il proprio nome, e in
 * un elenco lungo cercarlo in ordine di arrivo vuol dire far aspettare la
 * fila.
 */
export type RsvpOrder = "signup" | "name";

/**
 * Alfabetico all'italiana: accenti e maiuscole non contano nel confronto, come
 * già nella ricerca. «D'Àngelo» sta dove chi legge si aspetta «D'Angelo», e
 * «de luca» scritto in minuscolo non finisce in fondo alla lista.
 */
const nameCollator = new Intl.Collator("it", { sensitivity: "base" });

/**
 * L'elenco riordinato, senza toccare quello ricevuto.
 *
 * Anche `signup` ordina davvero invece di fidarsi di com'è arrivata la lista:
 * è l'etichetta che si legge sullo schermo, e deve restare vera anche il
 * giorno in cui la query cambia il suo `sort`.
 *
 * A parità di nome decide l'iscrizione: due omonimi devono stare sempre nello
 * stesso ordine, o si spunta l'uno credendo di spuntare l'altro.
 */
export function sortRsvps<T extends { name: string; createdAt: number }>(
  entries: T[],
  order: RsvpOrder,
): T[] {
  return [...entries].sort((a, b) =>
    order === "signup"
      ? a.createdAt - b.createdAt
      : nameCollator.compare(a.name, b.name) || a.createdAt - b.createdAt,
  );
}

/**
 * Da quando ha senso aprire la lista arrivi.
 *
 * Due condizioni in «oppure» e non una sola: `closesAt` è facoltativo sullo
 * Studio, quindi fermarsi alla scadenza vorrebbe dire che un modulo senza
 * scadenza non mostra il tasto mai — proprio gli eventi gestiti con più
 * leggerezza, che sono quelli che poi in cassa fanno tribolare.
 *
 * Il giorno intero e non l'ora d'inizio: la cassa si allestisce prima che
 * l'evento cominci, e alle 20:00 la lista deve già esserci.
 */
export function isCheckInOpen(
  closesAt: string | null | undefined,
  dateStart: string,
  now = Date.now(),
) {
  if (isRsvpClosed(closesAt, now)) return true;

  const start = new Date(dateStart);
  if (Number.isNaN(start.getTime())) return false;

  start.setHours(0, 0, 0, 0);
  return start.getTime() <= now;
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
