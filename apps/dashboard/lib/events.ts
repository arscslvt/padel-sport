import { TZDate } from "@date-fns/tz";
import * as date from "date-fns";
import { it } from "date-fns/locale";

import { CLUB_TIME_ZONE } from "@/lib/booking";
import type { EventCardData } from "@/sanity/types";

const locale = { locale: it };

/**
 * Le date di Sanity sono istanti assoluti (ISO con la Z) e vanno letti sempre
 * con l'orologio del club: senza `TZDate` `format` userebbe il fuso di chi
 * renderizza, e su Vercel — che gira in UTC — un evento delle 21:00 finiva in
 * pagina «alle 19:00». Vale anche per `isToday`/`isSameDay`: date-fns propaga
 * il fuso del primo argomento, quindi "Oggi" è oggi a Melilli.
 */
function toDate(value: string | number | Date) {
  const instant = value instanceof Date ? value : new Date(value);
  return new TZDate(instant, CLUB_TIME_ZONE);
}

/**
 * Etichetta leggibile per un evento: singola data (con la scorciatoia
 * "Oggi"/"Domani" già usata dalla vecchia lista) oppure intervallo compatto.
 */
export function formatEventDate(
  start: string | number | Date,
  end?: string | number | Date | null,
): string {
  const from = toDate(start);

  if (!end) {
    if (date.isToday(from))
      return date.format(from, "'Oggi alle' HH:mm", locale);
    if (date.isTomorrow(from))
      return date.format(from, "'Domani alle' HH:mm", locale);
    return date.format(from, "d MMMM yyyy 'alle' HH:mm", locale);
  }

  const to = toDate(end);

  if (date.isSameDay(from, to)) {
    return `${date.format(from, "d MMMM yyyy", locale)}, ${date.format(
      from,
      "HH:mm",
      locale,
    )} – ${date.format(to, "HH:mm", locale)}`;
  }

  if (date.isSameMonth(from, to) && date.isSameYear(from, to)) {
    return `${date.format(from, "d", locale)} – ${date.format(
      to,
      "d MMMM yyyy",
      locale,
    )}`;
  }

  if (date.isSameYear(from, to)) {
    return `${date.format(from, "d MMM", locale)} – ${date.format(
      to,
      "d MMM yyyy",
      locale,
    )}`;
  }

  return `${date.format(from, "d MMM yyyy", locale)} – ${date.format(
    to,
    "d MMM yyyy",
    locale,
  )}`;
}

/** Formato compatto per le card della lista. */
export function formatCardDate(event: EventCardData): string {
  const from = toDate(event.dateStart);

  if (event.dateEnd) {
    return formatEventDate(event.dateStart, event.dateEnd);
  }

  if (date.isToday(from)) return date.format(from, "'Oggi alle' HH:mm", locale);
  if (date.isTomorrow(from))
    return date.format(from, "'Domani alle' HH:mm", locale);

  return date.format(from, "d MMM yyyy", locale);
}

/** Un evento è "in programma" finché non è passata la sua data di fine (o di inizio). */
export function isUpcoming(
  event: Pick<EventCardData, "dateStart" | "dateEnd">,
  now: number = Date.now(),
): boolean {
  const reference = toDate(event.dateEnd ?? event.dateStart).getTime();
  return reference >= now;
}

/** Speculare a `isUpcoming`: l'evento si è già svolto. */
export function isConcluded(
  event: Pick<EventCardData, "dateStart" | "dateEnd">,
  now: number = Date.now(),
): boolean {
  return !isUpcoming(event, now);
}

export const SORT_OPTIONS = ["recent", "relevant"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export function isSortOption(value: string): value is SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(value);
}

/** Dal più recente al più vecchio. */
export function byRecent(a: EventCardData, b: EventCardData): number {
  return toDate(b.dateStart).getTime() - toDate(a.dateStart).getTime();
}

/** Prima gli evidenziati, poi gli eventi ancora in programma, poi per data. */
export function byRelevance(a: EventCardData, b: EventCardData): number {
  const highlighted = Number(!!b.highlighted) - Number(!!a.highlighted);
  if (highlighted !== 0) return highlighted;

  const upcoming = Number(isUpcoming(b)) - Number(isUpcoming(a));
  if (upcoming !== 0) return upcoming;

  return byRecent(a, b);
}

export function sortEvents(
  events: EventCardData[],
  sort: SortOption,
): EventCardData[] {
  return [...events].sort(sort === "relevant" ? byRelevance : byRecent);
}

/** Ricerca semplice su titolo, descrizione e tag. */
export function searchEvents(
  events: EventCardData[],
  query: string,
): EventCardData[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return events;

  const terms = needle.split(/\s+/);

  return events.filter((event) => {
    const haystack = [event.title, event.excerpt, ...(event.tags ?? [])]
      .join(" ")
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}
