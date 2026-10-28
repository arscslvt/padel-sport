import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { serverMutation } from "../../functions";
import { supportRequestStatus } from "../../tables/supportRequests";
import { MAX_REPLY } from "./lib";

/** Gli stati che il cliente viene a sapere: gli altri sono ordine interno. */
const NOTIFIED = new Set(["in_progress", "resolved"]);

/**
 * Sposta una segnalazione sui punti lungo il suo ciclo di vita.
 *
 * Quando passa a «in carico» o «risolta» il cliente riceve una mail
 * (pointReports/mail.ts), e solo se lo stato cambia davvero: riselezionare lo
 * stesso stato non deve fargli arrivare un doppione. `reply` vale solo per
 * «risolta» ed è la spiegazione che legge nella mail.
 */
export default serverMutation({
  args: {
    reportId: v.id("pointReports"),
    status: supportRequestStatus,
    reply: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, status, reply }) => {
    const report = await ctx.db.get(reportId);
    if (!report) {
      throw new Error("Segnalazione non trovata.");
    }

    const staffReply =
      status === "resolved" ? reply?.trim() || undefined : undefined;
    if (staffReply && staffReply.length > MAX_REPLY) {
      throw new Error(
        `La risposta è troppo lunga: resta sotto i ${MAX_REPLY} caratteri.`,
      );
    }

    if (report.status === status) return { notified: false };

    await ctx.db.patch(reportId, {
      status,
      ...(status === "resolved" ? { staffReply } : {}),
    });

    if (!NOTIFIED.has(status)) return { notified: false };

    await ctx.scheduler.runAfter(
      0,
      internal.modules.pointReports.mail.default,
      { reportId },
    );
    return { notified: true };
  },
});
