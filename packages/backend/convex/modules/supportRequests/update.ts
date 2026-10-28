import { v } from "convex/values";
import { serverMutation } from "../../functions";
import { supportRequestStatus } from "../../tables/supportRequests";

/**
 * Sposta una richiesta di assistenza lungo il suo ciclo di vita.
 *
 * Non cancella niente: «archiviata» è lo stato di chi non serve più, così una
 * richiesta gestita resta comunque leggibile a chi la cerca.
 */
export default serverMutation({
  args: {
    requestId: v.id("supportRequests"),
    status: supportRequestStatus,
  },
  handler: async (ctx, { requestId, status }) => {
    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Richiesta non trovata.");
    }

    await ctx.db.patch(requestId, { status });
  },
});
