import { defineTable } from "convex/server";
import { v } from "convex/values";

const redemptionStatus = v.union(
  /** Riscattato, da usare al club. */
  v.literal("active"),
  /** Consegnato: lo staff l'ha segnato come usato. */
  v.literal("used"),
  /** Annullato dallo staff: i punti sono tornati al cliente. */
  v.literal("cancelled"),
);

/**
 * Un premio riscattato: i punti sono già stati scalati, il premio si ritira al
 * club mostrando `code`.
 *
 * Titolo, termini e costo sono copiati dal premio al momento del riscatto:
 * se lo staff poi corregge il premio, chi l'ha già riscattato tiene le
 * condizioni che ha accettato.
 *
 * Lo stato «scaduto» non è scritto: si deduce da `expiresAt`, così non serve un
 * cron per tenerlo vero.
 */
const rewardRedemptions = defineTable({
  playerId: v.id("players"),
  rewardId: v.id("rewards"),
  title: v.string(),
  cost: v.float64(),
  terms: v.optional(v.string()),
  code: v.string(),
  status: redemptionStatus,
  expiresAt: v.optional(v.float64()),
  usedAt: v.optional(v.float64()),
  createdAt: v.float64(),
})
  .index("by_player", ["playerId", "createdAt"])
  .index("by_code", ["code"])
  .index("by_status", ["status"]);

export default rewardRedemptions;
export { redemptionStatus };
