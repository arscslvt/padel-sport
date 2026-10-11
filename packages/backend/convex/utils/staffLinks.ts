/**
 * Gli indirizzi del gestionale dello staff, per le notifiche che ci portano sopra.
 *
 * Una notifica che dice cos'è successo ma non porta da nessuna parte costringe
 * chi la riceve a riaprire il gestionale e ritrovare la cosa a mano. Da qui
 * escono i link che il tocco apre, ed è il solo posto dove sono scritti: se un
 * giorno la prenotazione avrà una pagina propria invece di un parametro, si
 * cambia qui e ogni avviso la segue.
 *
 * Il gestionale è un'app a parte (`apps/dashboard`) con un dominio suo, e le
 * sue pagine stanno alla radice. Il dominio si legge da `DASHBOARD_URL` sul
 * deployment Convex e da `NEXT_PUBLIC_DASHBOARD_URL` sul sito, che importa
 * questo file dalle sue route. Senza nessuna delle due si ripiega sul vecchio
 * `/dashboard` del sito, che rimanda al gestionale con la stessa query: un
 * salto in più, ma nessun link rotto mentre le variabili arrivano.
 */

const SITE_URL = process.env.SITE_URL ?? "https://asdpadelsport.com";

const RAW_BASE_URL = (
  process.env.DASHBOARD_URL ??
  process.env.NEXT_PUBLIC_DASHBOARD_URL ??
  `${SITE_URL}/dashboard`
)
  .trim()
  .replace(/\/+$/, "");

// Scritta senza protocollo, un link nella notifica non si aprirebbe.
const BASE_URL = /^https?:\/\//.test(RAW_BASE_URL)
  ? RAW_BASE_URL
  : `https://${RAW_BASE_URL}`;

/** I tre elenchi della pagina prenotazioni, come li nomina la dashboard. */
export type BookingsTab = "pending" | "merge" | "all";

/** L'agenda, eventualmente su un elenco preciso. */
export function staffBookingsUrl(tab?: BookingsTab) {
  return tab ? `${BASE_URL}?tab=${tab}` : BASE_URL;
}

/** L'agenda con una prenotazione già in evidenza. */
export function staffBookingUrl(bookingId: string, tab: BookingsTab = "all") {
  return `${BASE_URL}?tab=${tab}&booking=${encodeURIComponent(bookingId)}`;
}

/** L'anagrafica con la scheda di un cliente già aperta. */
export function staffClientUrl(playerId: string) {
  return `${BASE_URL}/clients?client=${encodeURIComponent(playerId)}`;
}

/**
 * Gli iscritti a un modulo di un evento. Un evento può averne più d'uno, quindi
 * serve anche la chiave del blocco: è la stessa coppia che la dashboard usa già
 * per identificare un modulo.
 */
export function staffEventFormUrl(eventId: string, blockKey: string) {
  return `${BASE_URL}/events?form=${encodeURIComponent(`${eventId}:${blockKey}`)}`;
}

/** Le richieste di assistenza, con una già aperta. */
export function staffSupportUrl(requestId: string) {
  return `${BASE_URL}/requests?support=${encodeURIComponent(requestId)}`;
}

/** Le richieste di giocatori, con una già aperta. */
export function staffMatchRequestUrl(requestId: string) {
  return `${BASE_URL}/requests?match=${encodeURIComponent(requestId)}`;
}

/** La configurazione, dove si governano campi e orari. */
export const STAFF_SETTINGS_URL = `${BASE_URL}/settings`;
