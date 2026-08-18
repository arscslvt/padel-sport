import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Occupazioni dei campi che non nascono da noi.
 *
 * Oggi arrivano dal calendario condiviso con SumUp, che accetta prenotazioni
 * per conto della struttura senza sapere nulla di questo database: senza
 * rispecchiarle qui, i due sistemi assegnerebbero lo stesso campo alla stessa
 * ora. `source` lascia spazio a un domani con altre origini.
 *
 * Non c'è riferimento a `slots`: il calendario di SumUp è uno solo, quindi un
 * appuntamento occupa *un* campo qualsiasi e non uno identificato. La
 * disponibilità cala di uno, ed è la lettura prudente.
 */
const externalBookings = defineTable({
  source: v.literal("sumup"),
  /** Id dell'evento sul calendario: è la chiave con cui si riconcilia. */
  externalId: v.string(),
  start: v.float64(),
  end: v.float64(),
  title: v.optional(v.string()),
  /** Evento «tutto il giorno»: di norma una giornata di chiusura. */
  allDay: v.boolean(),
  syncedAt: v.float64(),
})
  .index("by_external_id", ["externalId"])
  .index("by_start", ["start"]);

export default externalBookings;
