import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { supportRequestStatus } from "../../tables/supportRequests";
import { assertServer } from "../../utils/serverSecret";

/**
 * Sposta una richiesta di assistenza lungo il suo ciclo di vita.
 *
 * Non cancella niente: «archiviata» è lo stato di chi non serve più, così una
 * richiesta gestita resta comunque leggibile a chi la cerca.
 */
export default mutation({
  args: {
    secret: v.string(),
    requestId: v.id("supportRequests"),
    status: supportRequestStatus,
  },
  handler: async (ctx, { secret, requestId, status }) => {
    assertServer(secret);

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Richiesta non trovata.");
    }

    await ctx.db.patch(requestId, { status });
  },
});
