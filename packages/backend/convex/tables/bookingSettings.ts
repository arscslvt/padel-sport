import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Quando si può prenotare: un'unica riga, gestita dalla dashboard.
 *
 * Prima queste regole erano costanti sparse in tre punti (sito, app e
 * controllo lato server), e cambiare l'orario di chiusura voleva dire un
 * rilascio. Qui diventano dati: la struttura le muove da sola.
 */
const bookingSettings = defineTable({
  /**
   * Fasce di apertura per giorno della settimana, `0` = domenica come
   * `Date#getDay`. Un giorno senza fasce è un giorno di chiusura.
   */
  windows: v.array(
    v.object({
      weekday: v.float64(),
      /** "09:00" */
      start: v.string(),
      /** "12:30" */
      end: v.string(),
    }),
  ),
  /** Quanti giorni in avanti si può prenotare, oggi incluso. */
  bookableDays: v.float64(),
  updatedAt: v.float64(),
});

export default bookingSettings;
