import type { Route } from "next";

export const WHERE_WE_ARE_LINK: Route = "/where";
export const CLUB_LINK = "/club";
export const EVENTS_LINK = "/events";
export const BOOKING_LINK = "/book";
/**
 * Prenotazione tradizionale su SumUp: fino a poco fa `/book` ci rimandava e
 * basta. Ora è la strada per chi non ha un account del club — la verifica via
 * email non ha nessuno da riconoscere — e resta il gestore esterno citato
 * nell'informativa privacy.
 */
/**
 * Recupero delle prenotazioni: ci si riconosce con la mail e si ritrovano
 * codice e QR. È la via d'uscita quando la conferma non arriva in casella.
 */
export const MY_BOOKINGS_LINK = "/bookings" as Route;

export const SUMUP_BOOKING_URL =
  "https://www.sumupbookings.com/a-s-d-padel-sport-melilli";
/** Informativa privacy: raggiungibile dalla riga legale del footer. */
export const PRIVACY_LINK: Route = "/privacy";
/** Pagina statica del torneo: regolamento, formula e calendario. */
export const TROFEO_LINK = "/trofeo-san-sebastiano" as Route;
/** Tabellone con i risultati in diretta. */
export const TOURNAMENT_LINK = "/tournament/trofeo-san-sebastiano" as Route;

/**
 * Rimandi al Trofeo San Sebastiano (blocco su /events e riga nel menu).
 *
 * Il torneo non è un contenuto Sanity, quindi senza questi rimandi la sua
 * pagina non sarebbe raggiungibile da nessuna parte. È contenuto deperibile:
 * a torneo concluso basta rimettere `false` qui — poi si possono cancellare
 * `components/events/tournament-callout.tsx` e il blocco nel menu.
 */
export const SHOW_TOURNAMENT_BANNER = true;

export const eventLink = (slug: string) => `${EVENTS_LINK}/${slug}` as Route;
