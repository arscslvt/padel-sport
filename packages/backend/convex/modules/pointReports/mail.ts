import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction, internalQuery } from "../../_generated/server";
import { CATEGORY_LABELS } from "./lib";

/**
 * La mail che dice al cliente a che punto è la sua segnalazione sui punti.
 *
 * Stessa strada della mail dei movimenti (points/mail.ts): Convex → sito, dove
 * vivono Resend e i modelli. Lo stato si rilegge qui al momento dell'invio,
 * così la mail racconta quello che la segnalazione è adesso.
 */

export const payload = internalQuery({
  args: { reportId: v.id("pointReports") },
  handler: async (ctx, { reportId }) => {
    const report = await ctx.db.get(reportId);
    if (!report) return null;

    // Le altre transizioni non generano mail: se nel frattempo lo stato è
    // cambiato ancora, questa notizia è già vecchia.
    if (report.status !== "in_progress" && report.status !== "resolved") {
      return null;
    }

    const player = await ctx.db.get(report.playerId);
    if (!player) return null;

    const transaction = report.transactionId
      ? await ctx.db.get(report.transactionId)
      : null;

    return {
      status: report.status,
      firstName: player.firstName ?? player.name.split(" ")[0],
      email: player.email,
      clerkUserId: player.clerkUserId,
      category: CATEGORY_LABELS[report.category],
      transaction: transaction
        ? { label: transaction.label, delta: transaction.delta }
        : undefined,
      message: report.message,
      reply: report.staffReply,
      balance: player.points ?? 0,
    };
  },
});

export default internalAction({
  args: { reportId: v.id("pointReports") },
  handler: async (ctx, { reportId }) => {
    const data = await ctx.runQuery(
      internal.modules.pointReports.mail.payload,
      {
        reportId,
      },
    );

    if (!data || (!data.email && !data.clerkUserId)) return;

    const siteUrl = process.env.SITE_URL;
    const secret = process.env.BOOKING_WEBHOOK_SECRET;

    if (!siteUrl || !secret) {
      console.warn(
        "Mail della segnalazione non inviata: manca SITE_URL o BOOKING_WEBHOOK_SECRET sul deployment Convex.",
      );
      return;
    }

    try {
      const response = await fetch(`${siteUrl}/api/points/report-notify`, {
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
      // Lo stato è già salvato: la mail è un avviso, non la sua conferma.
      console.error("Mail della segnalazione non recapitata:", error);
    }
  },
});
