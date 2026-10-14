/**
 * Quando il club è aperto, giorno per giorno: le regole pure, senza database.
 *
 * Le leggono in tre: il server quando accetta una prenotazione
 * (settings/lib.ts), il sito quando propone gli orari, la dashboard quando li
 * mostra allo staff. Una regola sola, scritta una volta: un giorno chiuso per
 * il server è chiuso anche per chi prenota.
 *
 * Due modi di chiudere, oltre a lasciare un giorno senza fasce:
 * - un giorno della settimana spento (`closedWeekdays`): le sue fasce restano
 *   salvate, e riaccendendolo tornano com'erano;
 * - una chiusura per date (`closures`): uno o più giorni di fila, con un
 *   motivo facoltativo. Passata l'ultima data, il club riapre da solo.
 *
 * I giorni sono chiavi "AAAA-MM-GG" nell'ora del club: si confrontano come
 * stringhe, e una chiusura comprende i suoi estremi.
 */

export interface OpeningWindow {
  /** `0` = domenica, come `Date#getDay`. */
  weekday: number;
  /** "09:00" */
  start: string;
  /** "12:30" */
  end: string;
}

export interface Closure {
  /** Primo giorno chiuso, "AAAA-MM-GG". */
  from: string;
  /** Ultimo giorno chiuso, compreso. Uguale a `from` per un giorno solo. */
  to: string;
  /** «Natale», «Manutenzione campi»: lo leggono lo staff e chi prenota. */
  reason?: string;
}

export interface Schedule {
  windows: readonly OpeningWindow[];
  closedWeekdays?: readonly number[];
  closures?: readonly Closure[];
}

export const DAY_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** La chiusura che copre il giorno, se ce n'è una. */
export function closureOn(schedule: Schedule, day: string): Closure | null {
  return (
    schedule.closures?.find(
      (closure) => closure.from <= day && day <= closure.to,
    ) ?? null
  );
}

/** Il giorno della settimana è spento dalla dashboard. */
export function isWeekdayClosed(schedule: Schedule, weekday: number): boolean {
  return schedule.closedWeekdays?.includes(weekday) ?? false;
}

/**
 * Le fasce di apertura di un giorno preciso: nessuna se il giorno è chiuso,
 * per date o perché il suo giorno della settimana è spento.
 */
export function windowsForDay(
  schedule: Schedule,
  day: string,
  weekday: number,
): OpeningWindow[] {
  if (closureOn(schedule, day) || isWeekdayClosed(schedule, weekday)) {
    return [];
  }
  return schedule.windows.filter((window) => window.weekday === weekday);
}

/** La chiave "AAAA-MM-GG" di una data, letta nel fuso del dispositivo. */
export function localDayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Quanti giorni copre una chiusura, estremi compresi. */
export function closureLength(closure: Closure): number {
  const [from, to] = [closure.from, closure.to].map((key) => {
    const [year, month, day] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  });
  return Math.round((to - from) / 86_400_000) + 1;
}
