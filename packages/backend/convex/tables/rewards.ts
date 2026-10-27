import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Un premio che si sblocca con i punti.
 *
 * La foto sta nello storage di Convex e non su Sanity: il dataset Sanity è
 * pubblico e lo usa il sito per i contenuti editoriali, mentre un premio è un
 * dato operativo che lo staff carica e toglie dalla dashboard.
 *
 * `validityDays` è la scadenza **dal riscatto**: un premio sbloccato oggi non
 * vale per sempre, vale tot giorni da quando il cliente l'ha riscattato. Assente
 * vuol dire senza scadenza.
 *
 * Come i preset, i premi non si cancellano ma si archiviano: i riscatti già
 * fatti continuano a puntare qui.
 *
 * `disabled` è una pausa, non un ritiro: il premio resta nel catalogo dello
 * staff, ma la vetrina dei clienti non lo mostra e il riscatto lo rifiuta,
 * finché non lo si riattiva (un buono esaurito, un premio di stagione).
 * Assente vuol dire attivo: i premi creati prima non vanno migrati.
 */
const rewards = defineTable({
  /** Il club della riga (docs/multi-club.md). Opzionale fino alla Fase 3. */
  clubId: v.optional(v.id("clubs")),
  title: v.string(),
  description: v.string(),
  cost: v.float64(),
  imageStorageId: v.optional(v.id("_storage")),
  terms: v.optional(v.string()),
  validityDays: v.optional(v.float64()),
  archived: v.boolean(),
  disabled: v.optional(v.boolean()),
  createdAt: v.float64(),
})
  .index("by_archived", ["archived"])
  .index("by_club_archived", ["clubId", "archived"]);

export default rewards;
