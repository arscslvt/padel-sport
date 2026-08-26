/**
 * Gli indirizzi della dashboard staff, per le notifiche che ci portano sopra.
 *
 * Una notifica che dice cos'è successo ma non porta da nessuna parte costringe
 * chi la riceve a riaprire la dashboard e ritrovare la cosa a mano. Da qui
 * escono i link che il tocco apre, ed è il solo posto dove sono scritti: se un
 * giorno la prenotazione avrà una pagina propria invece di un parametro, si
 * cambia qui e ogni avviso la segue.
 *
 * Il dominio nudo è quello canonico — `www` risponde 301 e manda qui — lo
 * stesso di `apps/web/lib/booking-links.ts`, che serve invece i link pubblici.
 * `SITE_URL` esiste già sull'env del deployment Convex; sul sito non è
 * impostata e vale il valore di riserva.
 */

const BASE_URL = process.env.SITE_URL ?? "https://asdpadelsport.com";

/** I tre elenchi della pagina prenotazioni, come li nomina la dashboard. */
export type BookingsTab = "pending" | "merge" | "all";

/** L'agenda, eventualmente su un elenco preciso. */
export function staffBookingsUrl(tab?: BookingsTab) {
  return tab ? `${BASE_URL}/dashboard?tab=${tab}` : `${BASE_URL}/dashboard`;
}

/** L'agenda con una prenotazione già in evidenza. */
export function staffBookingUrl(bookingId: string, tab: BookingsTab = "all") {
  return `${BASE_URL}/dashboard?tab=${tab}&booking=${encodeURIComponent(bookingId)}`;
}

/** L'anagrafica con la scheda di un cliente già aperta. */
export function staffClientUrl(playerId: string) {
  return `${BASE_URL}/dashboard/clients?client=${encodeURIComponent(playerId)}`;
}

/**
 * Gli iscritti a un modulo di un evento. Un evento può averne più d'uno, quindi
 * serve anche la chiave del blocco: è la stessa coppia che la dashboard usa già
 * per identificare un modulo.
 */
export function staffEventFormUrl(eventId: string, blockKey: string) {
  return `${BASE_URL}/dashboard/events?form=${encodeURIComponent(`${eventId}:${blockKey}`)}`;
}

/** Le richieste di assistenza, con una già aperta. */
export function staffSupportUrl(requestId: string) {
  return `${BASE_URL}/dashboard/requests?support=${encodeURIComponent(requestId)}`;
}

/** Le richieste di giocatori, con una già aperta. */
export function staffMatchRequestUrl(requestId: string) {
  return `${BASE_URL}/dashboard/requests?match=${encodeURIComponent(requestId)}`;
}

/** La configurazione, dove si governano campi e orari. */
export const STAFF_SETTINGS_URL = `${BASE_URL}/dashboard/settings`;

/** Le bozze social, con una già aperta. */
export function staffSocialUrl(postId: string) {
  return `${BASE_URL}/dashboard/social?post=${encodeURIComponent(postId)}`;
}
