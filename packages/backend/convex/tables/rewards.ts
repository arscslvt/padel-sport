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
 */
const rewards = defineTable({
  title: v.string(),
  description: v.string(),
  cost: v.float64(),
  imageStorageId: v.optional(v.id("_storage")),
  terms: v.optional(v.string()),
  validityDays: v.optional(v.float64()),
  archived: v.boolean(),
  createdAt: v.float64(),
}).index("by_archived", ["archived"]);

export default rewards;
