import { ConvexError } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

/**
 * Quel che vale per ogni iscrizione, da qualunque parte arrivi.
 *
 * Le regole stanno qui e non in `create.ts` perché a scrivere sulle iscrizioni
 * sono in due: il modulo del sito e la dashboard. Sono due porte con due
 * permessi diversi, ma il conto dei posti dev'essere lo stesso — se una delle
 * due lo facesse per conto suo, prima o poi conterebbe un'altra cosa.
 */

/** Quanti accompagnatori sono ammessi se l'editor non ha configurato il limite. */
export const DEFAULT_MAX_GUESTS = 3;

/**
 * Il tetto agli accompagnatori quando a scrivere è la struttura.
 *
 * `maxGuests` del modulo qui non vale: è una regola per chi si iscrive da solo
 * dal sito, mentre al banco c'è qualcuno che le persone se le trova davanti e
 * le conta. Un tetto però resta, perché le tastiere scivolano: venti è più di
 * qualunque comitiva vera e abbastanza poco da rendere evidente il refuso.
 */
export const STAFF_MAX_GUESTS = 20;

/** Le iscrizioni valide di un modulo: le sole che occupano un posto. */
export async function confirmedRsvps(
  ctx: QueryCtx,
  eventId: string,
  blockKey: string,
): Promise<Doc<"eventRsvps">[]> {
  const entries = await ctx.db
    .query("eventRsvps")
    .withIndex("by_form", (q) =>
      q.eq("eventId", eventId).eq("blockKey", blockKey),
    )
    .collect();

  return entries.filter((entry) => entry.status === "confirmed");
}

/** I posti occupati: ogni iscrizione vale sé stessa più i suoi accompagnatori. */
export function seatsTakenOf(entries: Doc<"eventRsvps">[]) {
  return entries.reduce((total, entry) => total + entry.guests + 1, 0);
}

/** Il nome, ripulito. Il messaggio lo passa il chiamante: cambia chi lo legge. */
export function normalizedName(value: string, message: string) {
  const name = value.trim();

  if (name.length < 2) {
    throw new ConvexError({ code: "invalid", message });
  }

  return name;
}

/**
 * L'email, ripulita e in minuscolo.
 *
 * Il minuscolo non è cosmesi: è la chiave con cui si riconoscono i doppioni,
 * e «Mario@…» e «mario@…» sono la stessa casella.
 */
export function normalizedEmail(value: string) {
  const email = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new ConvexError({
      code: "invalid",
      message: "Inserisci un indirizzo email valido.",
    });
  }

  return email;
}

/** Gli accompagnatori: un intero, dentro il tetto di chi sta scrivendo. */
export function assertGuests(guests: number, maxGuests: number) {
  if (!Number.isInteger(guests) || guests < 0 || guests > maxGuests) {
    throw new ConvexError({
      code: "invalid",
      message: maxGuests
        ? `Puoi indicare al massimo ${maxGuests} accompagnatori.`
        : "Questo evento non ammette accompagnatori.",
    });
  }
}

/** «2 posti», «1 posto»: il plurale dei posti, che si ripete ovunque. */
export function seatsLabel(seats: number) {
  return seats === 1 ? "1 posto" : `${seats} posti`;
}
