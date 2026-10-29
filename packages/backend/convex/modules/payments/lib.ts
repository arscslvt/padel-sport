import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { bookingTotal } from "../pricing/lib";
import { bookingSettings } from "../settings/lib";
import { type CheckoutStatus, sumupConfig } from "./sumup";

/**
 * Le regole del pagamento online, in un posto solo: chi può pagare, quando, e
 * come si legge un esito di SumUp.
 *
 * Il pagamento è facoltativo e non tocca la conferma: una prenotazione pagata
 * resta in attesa dello staff come le altre, e una non pagata resta valida con
 * il pagamento in struttura.
 *
 * Si offre solo con due chiavi girate: quella di SumUp sul deployment e
 * l'interruttore del club nel gestionale (`onlinePaymentsEnabled`). Spegnere
 * l'interruttore ferma i pagamenti *nuovi*; gli esiti di quelli già partiti si
 * registrano comunque, perché quei soldi il cliente li ha già dati.
 */

export type PaymentStatus = Doc<"payments">["status"];

/** La pagina ospitata di SumUp resta aperta mezz'ora. */
export const CHECKOUT_SESSION_MS = 30 * 60 * 1000;

/**
 * Sotto questo margine una pagina ancora aperta non si riusa: mandare il
 * cliente su una pagina che scade mentre scrive il numero della carta è peggio
 * che aprirne una nuova.
 */
export const REUSE_MARGIN_MS = 5 * 60 * 1000;

/**
 * Quanto aspettare, oltre la scadenza, prima di rileggere l'esito da SumUp:
 * chi ha confermato all'ultimo secondo deve avere il tempo di finire.
 */
export const SETTLE_DELAY_MS = 2 * 60 * 1000;

/**
 * Un tentativo ancora senza checkout più giovane di così è un doppio tocco su
 * «Paga ora»: si aspetta il primo invece di aprirne un secondo.
 */
export const OPENING_GRACE_MS = 30 * 1000;

/** Perché la prenotazione non si può pagare online, o `null` se si può. */
export function payBlocker(
  booking: Doc<"bookings">,
  now: number = Date.now(),
): string | null {
  if (booking.status === "cancelled") {
    return "La prenotazione è stata annullata.";
  }
  if (booking.paymentMode === "online") {
    return "La prenotazione è già pagata.";
  }
  if (booking.bookingDate <= now) {
    return "La partita è già cominciata: si paga in struttura.";
  }
  return null;
}

/** Il pagamento online si può offrire adesso: chiave SumUp e via libera del club. */
export async function onlinePaymentsActive(
  ctx: QueryCtx,
  clubId: Id<"clubs">,
): Promise<boolean> {
  const club = await ctx.db.get(clubId);
  if (!club || sumupConfig(club) === null) return false;
  return (await bookingSettings(ctx, clubId)).onlinePaymentsEnabled;
}

/**
 * La prenotazione dal codice che sta nel QR e nell'indirizzo della pagina.
 *
 * Il codice è unico dentro il club, non fra club: la stessa sigla può stare
 * in due. Le funzioni interne dei pagamenti non hanno regole per riga, quindi
 * il club si filtra qui.
 */
export async function bookingByCode(
  ctx: QueryCtx,
  clubId: Id<"clubs">,
  code: string,
): Promise<Doc<"bookings"> | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  return await ctx.db
    .query("bookings")
    .withIndex("by_code", (q) => q.eq("code", normalized))
    .filter((q) => q.eq(q.field("clubId"), clubId))
    .first();
}

/**
 * Il pagamento visto da un elenco di prenotazioni: si può pagare, quanto, o è
 * già fatto. Senza tentativi da leggere, basta la prenotazione.
 */
export function paymentSummary(
  booking: Doc<"bookings">,
  now: number,
  /** `onlinePaymentsActive`, letto una volta per tutto l'elenco. */
  active: boolean,
) {
  const paid = booking.paymentMode === "online";

  return {
    paid,
    amount: paid ? (booking.paidAmount ?? 0) : bookingTotal(booking),
    canPay: active && payBlocker(booking, now) === null,
  };
}

/**
 * I riferimenti di un incasso, per ritrovarlo nel pannello SumUp: lo staff li
 * legge nella scheda della prenotazione per una controverifica, o per sapere
 * quale transazione rimborsare.
 */
export interface PaymentReference {
  /** Il nostro `checkout_reference` su SumUp. */
  paymentId: Id<"payments">;
  status: "paid" | "refunded";
  amount: number;
  paidAt: number;
  refundedAt?: number;
  /** L'ultimo rimborso tentato e non riuscito, da mostrare a chi riprova. */
  refundError?: string;
  /** Il codice che SumUp mostra fra le transazioni e sulla ricevuta. */
  transactionCode?: string;
  transactionId?: string;
  checkoutId?: string;
}

/**
 * Gli incassi online di una prenotazione, rimborsati compresi, dal primo. Di
 * norma uno solo: due incassi ancora validi vogliono dire un doppio pagamento
 * da rimborsare.
 */
export async function onlinePayments(
  ctx: QueryCtx,
  bookingId: Id<"bookings">,
): Promise<PaymentReference[]> {
  const attempts = await ctx.db
    .query("payments")
    .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
    .collect();

  return attempts
    .flatMap((attempt) =>
      attempt.status === "paid" || attempt.status === "refunded"
        ? [{ ...attempt, status: attempt.status }]
        : [],
    )
    .sort((a, b) => (a.paidAt ?? 0) - (b.paidAt ?? 0))
    .map((attempt) => ({
      paymentId: attempt._id,
      status: attempt.status,
      amount: attempt.amount,
      paidAt: attempt.paidAt ?? attempt.updatedAt,
      refundedAt: attempt.refundedAt,
      refundError: attempt.refundError,
      transactionCode: attempt.transactionCode,
      transactionId: attempt.transactionId,
      checkoutId: attempt.checkoutId,
    }));
}

export function statusFromCheckout(status: CheckoutStatus): PaymentStatus {
  switch (status) {
    case "PAID":
      return "paid";
    case "FAILED":
      return "failed";
    case "EXPIRED":
      return "expired";
    default:
      return "pending";
  }
}

/** Una pagina di pagamento che il cliente può ancora usare. */
export function isOpen(payment: Doc<"payments">, now: number): boolean {
  return (
    payment.status === "pending" &&
    Boolean(payment.checkoutUrl) &&
    payment.expiresAt > now
  );
}
