import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * La richiesta di uscita dal programma punti mandata dalla segreteria.
 *
 * Lo staff non può far uscire nessuno: può solo mandare alla persona una mail
 * con un link, e l'uscita vale quando lei la conferma da quella pagina, dopo
 * averne letto le conseguenze (modules/points/exit.ts). Così nessuno perde i
 * punti per un clic nel gestionale, e la conferma resta registrata qui.
 *
 * `token` è il link: chi ce l'ha conferma senza accedere, quindi va estratto a
 * caso e trattato come una password. Mandarne uno nuovo ritira i precedenti.
 */
const pointsExitRequests = defineTable({
  /** Il club della riga (docs/multi-club.md). Opzionale fino alla Fase 3. */
  clubId: v.optional(v.id("clubs")),
  playerId: v.id("players"),
  token: v.string(),
  /** L'indirizzo a cui è partita la mail, com'era in quel momento. */
  email: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("confirmed"),
    v.literal("revoked"),
  ),
  /** Chi dello staff l'ha mandata. */
  sentByClerkUserId: v.optional(v.string()),
  createdAt: v.float64(),
  expiresAt: v.float64(),
  confirmedAt: v.optional(v.float64()),
})
  .index("by_token", ["token"])
  .index("by_player", ["playerId"])
  .index("by_club", ["clubId"]);

export default pointsExitRequests;
