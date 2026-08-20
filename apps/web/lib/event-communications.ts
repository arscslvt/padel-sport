import { z } from "zod";

/**
 * Contratto delle comunicazioni via email, condiviso fra la console della
 * dashboard e le route che la servono.
 *
 * Qui dentro niente Sanity e niente `server-only`: questo file finisce anche
 * nel bundle del browser. La composizione dell'HTML sta in
 * `lib/communication-render.ts`, che resta lato server.
 */

export const communicationSendSchema = z.object({
  /** `_id` del documento Sanity */
  id: z.string().min(1),
  /** `_key` del modulo di iscrizione i cui iscritti riceveranno la mail */
  blockKey: z.string().min(1),
  /** Reinvio deliberato: la dashboard lo passa solo dopo la seconda conferma */
  allowResend: z.boolean().optional(),
});

export const communicationTestSchema = z.object({
  id: z.string().min(1),
});

export const communicationUnsubscribeSchema = z.object({
  token: z.string().min(8),
});

/**
 * Segnaposto del token nel link di disiscrizione.
 *
 * La route rende l'HTML **una volta sola** con questo al posto del token, poi
 * lo sostituisce per ogni destinatario. Rendere lo stesso corpo duecento volte
 * costerebbe secondi per niente; la sostituzione è sicura perché il token è un
 * UUID — solo cifre esadecimali e trattini — che finisce in un indirizzo
 * scritto da noi, e perché gli underscore sopravvivono a `encodeURIComponent`.
 */
export const UNSUBSCRIBE_TOKEN_PLACEHOLDER = "__UNSUBSCRIBE_TOKEN__";

/**
 * Pagina che smette di mandare comunicazioni su un evento.
 *
 * Gemella di `rsvpCancelPath` in `lib/event-rsvp.ts`, e volutamente un altro
 * indirizzo: annullare l'iscrizione libera il posto, disiscriversi dalle mail
 * no. Due conseguenze diverse vogliono due pagine diverse.
 */
export function communicationUnsubscribePath(slug: string, token: string) {
  return `/events/${slug}/comunicazioni/disiscriviti?token=${encodeURIComponent(token)}`;
}

/** La chiave con cui la dashboard identifica un modulo: la stessa dei link staff. */
export function formId(eventId: string, blockKey: string) {
  return `${eventId}:${blockKey}`;
}

/** Etichetta del numero di destinatari, per il pulsante e la conferma. */
export function recipientsLabel(count: number) {
  if (count === 0) return "nessun destinatario";
  return count === 1 ? "1 destinatario" : `${count} destinatari`;
}

/**
 * Il pulsante esiste solo se ha sia il testo sia l'indirizzo.
 *
 * Lo schema Sanity lo pretende già, ma un documento salvato prima di quella
 * regola può avere solo metà campo: meglio scartarlo qui che mandare una mail
 * con un pulsante che non porta da nessuna parte.
 */
export function normalizeCta(
  cta?: { label?: string | null; href?: string | null } | null,
) {
  return cta?.label && cta?.href ? { label: cta.label, href: cta.href } : null;
}
