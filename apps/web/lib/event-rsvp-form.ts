import "server-only";

import { client } from "@/sanity/client";
import { EVENT_RSVP_FORM_QUERY } from "@/sanity/queries";
import type { EventRsvpFormTarget } from "@/sanity/types";

/**
 * La configurazione di un modulo di iscrizione, riletta da Sanity.
 *
 * Le due route che scrivono iscrizioni — quella pubblica e quella della
 * dashboard — devono leggerla dalla stessa parte: posti, scadenza e
 * accompagnatori massimi sono decisioni dell'editor, e il browser manda solo
 * lo slug e la `_key` del blocco. Se ognuna se la ricavasse per conto suo,
 * basterebbe un ritocco in Studio perché le due contassero capienze diverse.
 *
 * Il client Sanity ha `perspective: "published"`, quindi un evento in bozza
 * non esiste per nessuna delle due — che è la cosa giusta: non è ancora online.
 */

/** Un modulo trovato davvero: l'evento con il blocco che c'è di sicuro. */
export type RsvpFormTarget = Omit<EventRsvpFormTarget, "form"> & {
  form: NonNullable<EventRsvpFormTarget["form"]>;
};

export async function loadRsvpForm(
  slug: string,
  key: string,
): Promise<RsvpFormTarget | null> {
  const target = await client.fetch<EventRsvpFormTarget | null>(
    EVENT_RSVP_FORM_QUERY,
    { slug, key },
  );

  return target?.form ? { ...target, form: target.form } : null;
}

/** I posti rimasti, o `null` se il modulo non ha una capienza. */
export function seatsLeftOf(
  capacity: number | null | undefined,
  seatsTaken: number,
) {
  return typeof capacity === "number"
    ? Math.max(capacity - seatsTaken, 0)
    : null;
}
