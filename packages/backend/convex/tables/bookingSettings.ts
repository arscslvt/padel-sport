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
  /**
   * Giorni della settimana spenti dalla dashboard: chiusi, ma con le loro
   * fasce ancora in `windows`, pronte per quando si riaccendono. Opzionale:
   * la riga può essere più vecchia del campo.
   */
  closedWeekdays: v.optional(v.array(v.float64())),
  /**
   * Chiusure per date ("AAAA-MM-GG" nell'ora del club, estremi compresi):
   * feste, manutenzioni, eventi. Quelle passate si tolgono da sole al primo
   * salvataggio (modules/settings/booking.ts). Opzionale come sopra.
   */
  closures: v.optional(
    v.array(
      v.object({
        from: v.string(),
        to: v.string(),
        reason: v.optional(v.string()),
        /**
         * Solo una fascia del giorno ("16:00"–"21:00", ora del club): la
         * pioggia che rende i campi impraticabili per un pomeriggio. Senza,
         * la chiusura vale tutto il giorno (modules/settings/schedule.ts).
         */
        start: v.optional(v.string()),
        end: v.optional(v.string()),
      }),
    ),
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
  /**
   * Il pagamento online con SumUp si offre ai clienti (modules/payments).
   *
   * È l'interruttore del club, distinto dalle chiavi sul deployment: le chiavi
   * dicono che il pagamento *si può* fare, questo che il club *vuole* farlo.
   * Nasce spento, e opzionale come sopra.
   */
  onlinePaymentsEnabled: v.optional(v.boolean()),
  updatedAt: v.float64(),
});

export default bookingSettings;
