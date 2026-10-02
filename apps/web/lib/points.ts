import { CLUB_TIME_ZONE } from "@/lib/booking";

/**
 * Piccoli aiuti condivisi fra area personale, dashboard e mail dei punti.
 */

/** "3 ottobre 2026" nell'ora del club: la scadenza di un premio. */
export function formatClubDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("it-IT", {
    timeZone: CLUB_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "1 punto", "3 punti": il singolare conta anche in una riga di elenco. */
export function pointsLabel(points: number): string {
  const amount = Math.abs(points);
  return `${amount} ${amount === 1 ? "punto" : "punti"}`;
}

/** "+3", "-5": il movimento come si legge in un registro. */
export function signedPoints(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}
