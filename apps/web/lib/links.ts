import type { Route } from "next";

export const WHERE_WE_ARE_LINK: Route = "/where";
export const CLUB_LINK = "/club";
export const EVENTS_LINK = "/events";
export const BOOKING_LINK = "/book";
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
