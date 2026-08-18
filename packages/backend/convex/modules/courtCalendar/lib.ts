import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

/**
 * Il ponte con SumUp, in due righe: SumUp Bookings non ha API pubbliche (il
 * portale sviluppatori copre solo i pagamenti), ma sa sincronizzarsi con un
 * calendario Google in entrambe le direzioni. Quel calendario è il terreno
 * comune: noi ci leggiamo le prenotazioni prese da SumUp e ci scriviamo le
 * nostre, che SumUp reimporta come orari occupati.
 */

/** Quanto avanti guardiamo: gli stessi sette giorni prenotabili, più margine. */
export const SYNC_WINDOW_DAYS = 14;

/**
 * Marcatore degli eventi nati qui.
 *
 * Con la sincronizzazione bidirezionale su un unico calendario, un evento che
 * scriviamo noi torna indietro come evento del calendario: senza distinguerlo
 * lo conteggeremmo come occupazione esterna e la stessa prenotazione bloccherebbe
 * due campi invece di uno.
 */
export const SOURCE_PROPERTY = "padelSource";
export const SOURCE_VALUE = "convex";

/** Fuso della struttura: gli eventi «tutto il giorno» arrivano senza orario. */
export const CLUB_TIME_ZONE = "Europe/Rome";

export interface ExternalBlock {
  externalId: string;
  start: number;
  end: number;
  title?: string;
  allDay: boolean;
}

export function syncWindow(now: number = Date.now()) {
  return {
    from: now,
    to: now + SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return startA < endB && endA > startB;
}

/**
 * Occupazioni esterne che si sovrappongono all'intervallo indicato.
 *
 * La tabella contiene al massimo la finestra sincronizzata — due settimane di
 * eventi per due campi — quindi la scansione è breve e il filtro può restare
 * esatto invece di indovinare quanto può durare un evento.
 */
export async function externalBlocksBetween(
  ctx: QueryCtx,
  start: number,
  end: number,
): Promise<Doc<"externalBookings">[]> {
  const candidates = await ctx.db
    .query("externalBookings")
    .withIndex("by_start", (q) => q.lt("start", end))
    .collect();

  return candidates.filter((block) => block.end > start);
}
