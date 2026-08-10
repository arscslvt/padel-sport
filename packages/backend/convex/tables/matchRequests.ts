import { defineTable } from "convex/server";
import { v } from "convex/values";

const matchRequestLevel = v.union(
  v.literal("principiante"),
  v.literal("intermedio"),
  v.literal("avanzato"),
);

const matchRequestStatus = v.union(
  /** Ricevuta, nessuno l'ha ancora presa in carico */
  v.literal("new"),
  /** La segreteria sta cercando i giocatori */
  v.literal("in_progress"),
  /** Match completato */
  v.literal("fulfilled"),
  v.literal("cancelled"),
);

/**
 * Richiesta di giocatori inviata dal modulo pubblico del sito.
 *
 * Distinta da `openMatches`: quella è matchmaking fra utenti autenticati sopra
 * una prenotazione già esistente, questa è una richiesta anonima che la
 * segreteria evade a mano. Qui non c'è un `players` collegato, solo i recapiti
 * lasciati nel modulo.
 */
const matchRequests = defineTable({
  name: v.string(),
  email: v.string(),
  phone: v.string(),
  /** Data e ora desiderate, in millisecondi */
  matchDate: v.float64(),
  level: matchRequestLevel,
  /** Quanti giocatori mancano per completare la partita (1-3) */
  missingPlayers: v.float64(),
  notes: v.optional(v.string()),
  status: matchRequestStatus,
  /** Esito dell'invio delle mail: la richiesta resta valida anche se fallisce */
  notifiedAt: v.optional(v.float64()),
  createdAt: v.float64(),
})
  .index("by_status_date", ["status", "matchDate"])
  .index("by_date", ["matchDate"])
  .index("by_email", ["email"]);

export default matchRequests;
export { matchRequestLevel, matchRequestStatus };
