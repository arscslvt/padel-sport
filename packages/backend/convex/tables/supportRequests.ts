import { defineTable } from "convex/server";
import { v } from "convex/values";

const supportRequestStatus = v.union(
  /** Ricevuta, nessuno l'ha ancora presa in carico */
  v.literal("new"),
  v.literal("in_progress"),
  v.literal("resolved"),
  v.literal("archived"),
);

/**
 * Richiesta di assistenza inviata dal modulo di supporto del sito.
 *
 * Distinta da `matchRequests`: quella cerca giocatori per una partita, questa è
 * il canale di contatto generico (tesseramento, orari, problemi, altro).
 */
const supportRequests = defineTable({
  name: v.string(),
  email: v.string(),
  phone: v.string(),
  /** Numero di matricola socio, se chi scrive è tesserato */
  memberId: v.optional(v.string()),
  message: v.string(),
  status: supportRequestStatus,
  /** Esito dell'invio delle mail: la richiesta resta valida anche se fallisce */
  notifiedAt: v.optional(v.float64()),
  createdAt: v.float64(),
})
  .index("by_status_created", ["status", "createdAt"])
  .index("by_created", ["createdAt"])
  .index("by_email", ["email"])
  .index("by_member", ["memberId"]);

export default supportRequests;
export { supportRequestStatus };
