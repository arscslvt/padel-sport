import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, serverAction } from "../../functions";
import { bookingChanged } from "../points/auto";
import { roundEuro } from "../pricing/lib";
import { getCheckout, refundTransaction, snapshot, sumupConfig } from "./sumup";

/**
 * Il rimborso di un pagamento online. Lo decide sempre lo staff, mai il
 * sistema da solo:
 *
 * - annullando o rifiutando la prenotazione, se nella modale resta la spunta
 *   «Rimborsa il pagamento online»;
 * - dalla scheda della prenotazione, in qualunque momento: dopo
 *   l'annullamento, o su una prenotazione confermata (un doppio pagamento, un
 *   cliente che ha pagato anche in cassa).
 *
 * Il rimborso è sempre totale, sulla carta con cui si è pagato. Una volta
 * rimborsato, il pagamento non torna più «pagato»: `apply` e `settle`
 * (checkout.ts) lo trattano come chiuso.
 *
 * Passa dalla route della dashboard (api/dashboard/bookings/refund), che ha
 * già verificato con Clerk che chi chiede è dello staff.
 */

/** Oltre questo tempo un rimborso «in corso» si considera interrotto. */
const REFUND_LOCK_MS = 2 * 60 * 1000;

interface RefundTarget {
  paymentId: Id<"payments">;
  amount: number;
  transactionId?: string;
  checkoutId?: string;
}

/**
 * Segna come «in corso» gli incassi da rimborsare e li restituisce. È qui che
 * si ferma il secondo operatore: dentro una transazione, non nel browser.
 */
export const begin = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    /** Uno solo, per esempio il doppione; senza, tutti quelli incassati. */
    paymentId: v.optional(v.id("payments")),
    /** Il club dello staff che lo chiede. */
    clubId: v.id("clubs"),
  },
  handler: async (
    ctx,
    { bookingId, paymentId, clubId },
  ): Promise<RefundTarget[]> => {
    const now = Date.now();

    // L'action non ha regole per riga, e l'id arriva dal gestionale: senza
    // questo controllo lo staff di un club rimborserebbe l'incasso di un altro.
    const booking = await ctx.db.get(bookingId);
    if (!booking || booking.clubId !== clubId) {
      throw new Error("Prenotazione non trovata.");
    }

    const attempts = await ctx.db
      .query("payments")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .collect();

    const targets = attempts.filter(
      (attempt) =>
        attempt.status === "paid" &&
        (paymentId === undefined || attempt._id === paymentId),
    );

    if (targets.length === 0) {
      throw new Error("Non c'è nessun pagamento online da rimborsare.");
    }

    if (
      targets.some(
        (attempt) =>
          attempt.refundStartedAt !== undefined &&
          now - attempt.refundStartedAt < REFUND_LOCK_MS,
      )
    ) {
      throw new Error(
        "Un rimborso è già in corso: aspetta qualche secondo e ricarica.",
      );
    }

    for (const attempt of targets) {
      await ctx.db.patch(attempt._id, {
        refundStartedAt: now,
        updatedAt: now,
      });
    }

    return targets.map((attempt) => ({
      paymentId: attempt._id,
      amount: attempt.amount,
      transactionId: attempt.transactionId,
      checkoutId: attempt.checkoutId,
    }));
  },
});

/**
 * Il rimborso è andato: il pagamento si chiude e la prenotazione torna a
 * quello che resta incassato — di norma niente, quindi «in struttura».
 */
export const complete = internalMutation({
  args: {
    paymentId: v.id("payments"),
    staffUserId: v.optional(v.string()),
  },
  handler: async (ctx, { paymentId, staffUserId }) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) return;

    const now = Date.now();
    await ctx.db.patch(paymentId, {
      status: "refunded",
      refundedAt: now,
      refundedBy: staffUserId,
      refundStartedAt: undefined,
      refundError: undefined,
      updatedAt: now,
    });

    const booking = await ctx.db.get(payment.bookingId);
    if (!booking) return;

    const stillPaid = (
      await ctx.db
        .query("payments")
        .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
        .collect()
    ).filter((attempt) => attempt.status === "paid");

    if (stillPaid.length === 0) {
      await ctx.db.patch(booking._id, {
        paymentMode: "on_site",
        paidAmount: undefined,
      });
      // Il punto del pagamento online torna indietro con il rimborso.
      await bookingChanged(ctx, booking._id);
      return;
    }

    // Rimborsato il doppione: resta pagata, per quanto è rimasto.
    await ctx.db.patch(booking._id, {
      paidAmount: roundEuro(
        stillPaid.reduce((sum, attempt) => sum + attempt.amount, 0),
      ),
    });
  },
});

/** Il rimborso non è riuscito: il pagamento resta incassato, col motivo. */
export const fail = internalMutation({
  args: { paymentId: v.id("payments"), error: v.string() },
  handler: async (ctx, { paymentId, error }) => {
    await ctx.db.patch(paymentId, {
      refundStartedAt: undefined,
      refundError: error.slice(0, 500),
      updatedAt: Date.now(),
    });
  },
});

export interface RefundOutcome {
  /** Quanti incassi sono stati rimborsati, e per quanto in tutto. */
  refunded: number;
  amount: number;
  /** I motivi dei rimborsi non riusciti, da mostrare all'operatore. */
  failed: string[];
}

export default serverAction({
  args: {
    bookingId: v.id("bookings"),
    paymentId: v.optional(v.id("payments")),
    /** Chi dello staff lo chiede: resta sul pagamento. */
    staffUserId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<RefundOutcome> => {
    const config = sumupConfig(ctx.club);
    if (!config) {
      throw new Error(
        "Le chiavi di SumUp non sono configurate: rimborsa dal pannello SumUp.",
      );
    }

    const targets: RefundTarget[] = await ctx.runMutation(
      internal.modules.payments.refund.begin,
      {
        bookingId: args.bookingId,
        paymentId: args.paymentId,
        clubId: ctx.club._id,
      },
    );

    const outcome: RefundOutcome = { refunded: 0, amount: 0, failed: [] };

    for (const target of targets) {
      try {
        // La transazione si salva all'incasso; se mancasse, la si ritrova
        // dal checkout.
        const transactionId =
          target.transactionId ??
          (target.checkoutId
            ? snapshot(await getCheckout(config, target.checkoutId))
                .transactionId
            : undefined);

        if (!transactionId) {
          throw new Error("Transazione SumUp non trovata per questo pagamento.");
        }

        await refundTransaction(config, transactionId);
        await ctx.runMutation(internal.modules.payments.refund.complete, {
          paymentId: target.paymentId,
          staffUserId: args.staffUserId,
        });

        outcome.refunded += 1;
        outcome.amount = roundEuro(outcome.amount + target.amount);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Rimborso SumUp non riuscito:", target.paymentId, error);

        await ctx.runMutation(internal.modules.payments.refund.fail, {
          paymentId: target.paymentId,
          error: message,
        });
        outcome.failed.push(message);
      }
    }

    return outcome;
  },
});
