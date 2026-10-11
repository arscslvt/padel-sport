import { defineTable } from "convex/server";
import { v } from "convex/values";
import { supportRequestStatus } from "./supportRequests";

const pointReportCategory = v.union(
  /** Un movimento c'è ma l'importo non torna */
  v.literal("wrong_points"),
  /** Punti che il cliente si aspettava e non vede */
  v.literal("missing_points"),
  /** Nessun errore: vuole solo capire */
  v.literal("question"),
);

/**
 * Segnalazione sui punti inviata dall'area personale.
 *
 * Distinta da `supportRequests` perché arriva da chi è già autenticato: nome,
 * mail e telefono stanno sulla scheda del giocatore, e copiarli qui li
 * congelerebbe al giorno dell'invio. Lo stato invece è lo stesso
 * dell'assistenza: una segnalazione si risolve o si archivia allo stesso modo.
 */
const pointReports = defineTable({
  playerId: v.id("players"),
  /** Il movimento contestato. Assente quando mancano punti mai caricati. */
  transactionId: v.optional(v.id("pointTransactions")),
  category: pointReportCategory,
  message: v.string(),
  status: supportRequestStatus,
  /** Cosa lo staff ha risposto chiudendo la segnalazione: finisce nella mail. */
  staffReply: v.optional(v.string()),
  createdAt: v.float64(),
})
  .index("by_created", ["createdAt"])
  .index("by_player", ["playerId", "createdAt"]);

export default pointReports;
export { pointReportCategory };
