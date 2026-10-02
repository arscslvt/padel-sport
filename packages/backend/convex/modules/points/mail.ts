import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction, internalQuery } from "../../_generated/server";

/**
 * La mail che segue ogni movimento di punti: carico, rimozione, riscatto.
 *
 * Come per le prenotazioni (notifications/bookingMail.ts) il verso è Convex →
 * sito: Resend e i modelli vivono là, l'indirizzo del cliente sta qui o su
 * Clerk, e il sito lo risolve partendo dal suo account.
 *
 * Chi non ha lasciato una mail non riceve niente, e va benissimo: i punti
 * restano suoi e li vede allo sportello o dall'area personale.
 */

export const payload = internalQuery({
  args: { transactionId: v.id("pointTransactions") },
  handler: async (ctx, { transactionId }) => {
    const transaction = await ctx.db.get(transactionId);
    if (!transaction) return null;

    const player = await ctx.db.get(transaction.playerId);
    if (!player) return null;

    const redemption = transaction.redemptionId
      ? await ctx.db.get(transaction.redemptionId)
      : null;

    return {
      firstName: player.firstName ?? player.name.split(" ")[0],
      email: player.email,
      clerkUserId: player.clerkUserId,
      delta: transaction.delta,
      label: transaction.label,
      note: transaction.note,
      balance: transaction.balanceAfter,
      // Solo per la spesa: la restituzione di un riscatto annullato è un
      // carico come un altro, e la mail deve dire «ti abbiamo ridato i punti».
      redemption:
        redemption && transaction.delta < 0
          ? {
              title: redemption.title,
              code: redemption.code,
              terms: redemption.terms,
              expiresAt: redemption.expiresAt,
            }
          : undefined,
    };
  },
});

export default internalAction({
  args: { transactionId: v.id("pointTransactions") },
  handler: async (ctx, { transactionId }) => {
    const data = await ctx.runQuery(internal.modules.points.mail.payload, {
      transactionId,
    });

    if (!data || (!data.email && !data.clerkUserId)) return;

    const siteUrl = process.env.SITE_URL;
    const secret = process.env.BOOKING_WEBHOOK_SECRET;

    if (!siteUrl || !secret) {
      console.warn(
        "Mail dei punti non inviata: manca SITE_URL o BOOKING_WEBHOOK_SECRET sul deployment Convex.",
      );
      return;
    }

    try {
      const response = await fetch(`${siteUrl}/api/points/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-booking-webhook-secret": secret,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      // I punti sono già sul conto: la mail è una cortesia, non una conferma.
      console.error("Mail dei punti non recapitata:", error);
    }
  },
});
