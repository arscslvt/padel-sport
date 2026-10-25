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
 *   Con `start` ed `end` chiude solo quella fascia di ogni giorno: le ore di
 *   pioggia, più quelle che servono ai campi per asciugarsi.
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
  /** "16:00": da qui la fascia chiusa. Assente: chiuso tutto il giorno. */
  start?: string;
  /** "21:00": fin qui, esclusa. Va sempre con `start`. */
  end?: string;
}

export interface Schedule {
  windows: readonly OpeningWindow[];
  closedWeekdays?: readonly number[];
  closures?: readonly Closure[];
}

export const DAY_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Una chiusura che vale solo per una fascia del giorno. */
export function isHourClosure(closure: Closure): boolean {
  return Boolean(closure.start && closure.end);
}

/** La chiusura che copre il giorno intero, se ce n'è una. */
export function closureOn(schedule: Schedule, day: string): Closure | null {
  return (
    schedule.closures?.find(
      (closure) =>
        !isHourClosure(closure) && closure.from <= day && day <= closure.to,
    ) ?? null
  );
}

/** Le fasce chiuse di un giorno, in ordine d'orario. */
export function hourClosuresOn(schedule: Schedule, day: string): Closure[] {
  return (schedule.closures ?? [])
    .filter(
      (closure) =>
        isHourClosure(closure) && closure.from <= day && day <= closure.to,
    )
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
}

/**
 * «dalle 16 alle 21», «dalle 14:30 alle 21:30»: la fascia di una chiusura di
 * poche ore, come la si dice a voce. Nulla per una chiusura di giorni interi.
 */
export function closureHoursLabel(closure: Closure): string | null {
  if (!closure.start || !closure.end) return null;
  const spoken = (time: string) =>
    time.endsWith(":00") ? String(Number(time.slice(0, 2))) : time;
  return `dalle ${spoken(closure.start)} alle ${spoken(closure.end)}`;
}

/** "16:30" → 990. */
function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** 990 → "16:30". */
function timeOf(minutes: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
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
  const windows = schedule.windows.filter(
    (window) => window.weekday === weekday,
  );

  // Le fasce chiuse si tolgono dalle fasce di apertura, che possono restare
  // spezzate in due: chi legge le fasce (server, sito, dashboard) vede solo
  // le ore in cui si può davvero giocare.
  const closed = hourClosuresOn(schedule, day);
  if (closed.length === 0) return windows;

  return windows.flatMap((window) => {
    let pieces = [{ start: minutesOf(window.start), end: minutesOf(window.end) }];
    for (const closure of closed) {
      const from = minutesOf(closure.start ?? "00:00");
      const to = minutesOf(closure.end ?? "24:00");
      pieces = pieces.flatMap((piece) => {
        if (to <= piece.start || piece.end <= from) return [piece];
        return [
          { start: piece.start, end: from },
          { start: to, end: piece.end },
        ].filter((rest) => rest.end > rest.start);
      });
    }
    return pieces.map((piece) => ({
      weekday,
      start: timeOf(piece.start),
      end: timeOf(piece.end),
    }));
  });
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
