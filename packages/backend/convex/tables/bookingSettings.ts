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
  /**
   * Prenotare online richiede la tessera del club in corso e pagata.
   *
   * Nasce spento e va acceso dal club: acceso su un'anagrafica ancora vuota
   * rifiuterebbe tutti, perché nessuno risulterebbe iscritto. È opzionale
   * perché la riga di configurazione può essere più vecchia di questo campo.
   */
  membershipRequired: v.optional(v.boolean()),
  /**
   * La prenotazione deve arrivare con la squadra al completo: quattro nomi,
   * non uno solo con la promessa di trovare gli altri.
   *
   * Riguarda le partite private, le uniche che nessun altro può riempire.
   * Quelle pubbliche e di cerchia nascono apposta con i posti liberi, e questa
   * spunta non le tocca. Opzionale come sopra: la riga può essere più vecchia
   * del campo.
   */
  fullSquadRequired: v.optional(v.boolean()),
  updatedAt: v.float64(),
});

export default bookingSettings;
