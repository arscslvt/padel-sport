import { isUpcoming } from "@/lib/events";
import type { SanityImage } from "@/sanity/types";

/**
 * Selezione dell'evento da annunciare nella barra sotto la navigazione.
 *
 * La divisione dei compiti è voluta: il server risponde solo a «quali sono i
 * prossimi eventi» — dato che cambia di rado, quindi cacheabile — mentre il
 * verdetto «è imminente?» lo calcola il client sull'ora reale. Così né una
 * risposta cacheata né una scheda lasciata aperta per ore possono annunciare
 * un evento già finito.
 */

/** Oltre questa distanza dall'inizio l'evento non è ancora "imminente". */
export const IMMINENT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export type ImminentEvent = {
  _id: string;
  title: string;
  slug: string;
  dateStart: string;
  dateEnd?: string | null;
  banner?: SanityImage | null;
};

/**
 * Primo evento che inizia entro la finestra e non è ancora finito.
 *
 * Una `dateStart` già passata dà differenza negativa, quindi minore della
 * finestra: un evento su più giorni resta annunciato mentre è in corso, finché
 * `isUpcoming` non diventa falso.
 */
export function pickImminent(
  events: ImminentEvent[],
  now: number = Date.now(),
): ImminentEvent | null {
  return (
    events.find(
      (event) =>
        isUpcoming(event, now) &&
        new Date(event.dateStart).getTime() - now < IMMINENT_WINDOW_MS,
    ) ?? null
  );
}
