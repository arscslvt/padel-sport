import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * A che punto è un tentativo di pagamento.
 *
 * - `pending`: la pagina di SumUp è aperta (o si sta aprendo), nessun esito;
 * - `paid`: SumUp conferma l'incasso;
 * - `failed`: la carta è stata rifiutata, o il checkout non si è potuto creare;
 * - `expired`: la mezz'ora della pagina è passata senza pagamento, o il
 *   tentativo è stato sostituito da uno nuovo.
 */
const paymentStatus = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("expired"),
);

/**
 * I pagamenti online delle prenotazioni, uno per tentativo.
 *
 * È una tabella e non un campo sulla prenotazione perché un cliente può aprire
 * la pagina di pagamento, lasciarla scadere e riprovare il giorno dopo: ogni
 * tentativo è un checkout SumUp diverso, con il suo esito, e lo storico serve
 * quando c'è da ricostruire cosa è successo. La prenotazione tiene solo il
 * risultato (`paymentMode`, `paidAmount`).
 *
 * L'id della riga è anche il `checkout_reference` mandato a SumUp: unico per
 * costruzione, e riporta dritto qui dal pannello di SumUp.
 */
const payments = defineTable({
  bookingId: v.id("bookings"),
  /** Chi ha aperto il pagamento: il titolare della prenotazione. */
  playerId: v.id("players"),
  provider: v.literal("sumup"),
  /** Euro, fissati all'apertura: la squadra di quel momento al listino della prenotazione. */
  amount: v.float64(),
  currency: v.literal("EUR"),
  status: paymentStatus,
  /** Id del checkout SumUp: arriva appena SumUp risponde. */
  checkoutId: v.optional(v.string()),
  /** La pagina di pagamento ospitata da SumUp. */
  checkoutUrl: v.optional(v.string()),
  /** Fin quando la pagina accetta il pagamento. */
  expiresAt: v.float64(),
  /** La transazione dell'incasso: è quella che si rimborsa. */
  transactionId: v.optional(v.string()),
  /** Il codice che SumUp mostra nel suo pannello e sulla ricevuta. */
  transactionCode: v.optional(v.string()),
  paidAt: v.optional(v.float64()),
  /** Perché il tentativo si è chiuso male, quando lo sappiamo noi. */
  error: v.optional(v.string()),
  createdAt: v.float64(),
  updatedAt: v.float64(),
})
  .index("by_booking", ["bookingId"])
  .index("by_checkout", ["checkoutId"]);

export default payments;
export { paymentStatus };
