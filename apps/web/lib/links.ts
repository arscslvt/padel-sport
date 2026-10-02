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
/**
 * Area personale del socio: prenotazioni e portafoglio punti in un posto solo.
 * È anche il link che le mail dei punti portano con sé.
 */
export const PERSONAL_AREA_LINK = "/area-personale" as Route;

export const SUMUP_BOOKING_URL =
  "https://www.sumupbookings.com/a-s-d-padel-sport-melilli";
/** Informativa privacy: raggiungibile dalla riga legale del footer. */
export const PRIVACY_LINK: Route = "/privacy";
/** Regolamento del programma punti: va accettato prima di ricevere punti. */
export const POINTS_TERMS_LINK = "/regolamento-punti" as Route;
/** Tabellone con i risultati in diretta. */
export const TOURNAMENT_LINK = "/tournament/trofeo-san-sebastiano" as Route;

export const eventLink = (slug: string) => `${EVENTS_LINK}/${slug}` as Route;
