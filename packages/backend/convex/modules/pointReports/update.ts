import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { supportRequestStatus } from "../../tables/supportRequests";
import { assertServer } from "../../utils/serverSecret";

/** Sposta una segnalazione sui punti lungo il suo ciclo di vita. */
export default mutation({
  args: {
    secret: v.string(),
    reportId: v.id("pointReports"),
    status: supportRequestStatus,
  },
  handler: async (ctx, { secret, reportId, status }) => {
    assertServer(secret);

    const report = await ctx.db.get(reportId);
    if (!report) {
      throw new Error("Segnalazione non trovata.");
    }

    await ctx.db.patch(reportId, { status });
  },
});
