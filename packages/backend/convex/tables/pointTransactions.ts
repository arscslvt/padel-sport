import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Un movimento di punti: il registro da cui nasce il saldo.
 *
 * Il saldo sta anche sul giocatore (`players.points`), ma come copia comoda da
 * leggere: la verità è qui, una riga per ogni carico, rimozione o riscatto. È
 * quello che serve quando qualcuno chiede «ma questi tre punti da dove
 * vengono?».
 *
 * `label` è copiata dal preset e non letta ogni volta: rinominare un preset non
 * deve riscrivere la storia di chi quei punti li ha già ricevuti.
 *
 * `balanceAfter` congela il saldo dopo il movimento: la mail lo riporta, e
 * l'elenco lo mostra senza dover risommare tutto.
 */
const pointTransactions = defineTable({
  playerId: v.id("players"),
  delta: v.float64(),
  label: v.string(),
  note: v.optional(v.string()),
  presetId: v.optional(v.id("pointPresets")),
  /** Presente quando i punti sono stati spesi per un premio. */
  redemptionId: v.optional(v.id("rewardRedemptions")),
  balanceAfter: v.float64(),
  /**
   * Punti caricati a chi non ha ancora aderito al programma: sono registrati
   * ma non ancora suoi, quindi non entrano nel saldo e non generano mail.
   * Diventano effettivi — e `balanceAfter` diventa vero — quando la persona
   * accetta il regolamento (modules/points/terms.ts). Finché sono in attesa,
   * `balanceAfter` vale il saldo del momento e non va mostrato.
   */
  pending: v.optional(v.boolean()),
  /** Quando un movimento in attesa è stato accreditato. */
  confirmedAt: v.optional(v.float64()),
  /** Chi dello staff ha caricato il movimento; assente per i riscatti del cliente. */
  createdByClerkUserId: v.optional(v.string()),
  createdAt: v.float64(),
}).index("by_player", ["playerId", "createdAt"]);

export default pointTransactions;
