import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { matchRequestStatus } from "../../tables/matchRequests";
import { assertServer } from "../../utils/serverSecret";

/** Sposta una richiesta di giocatori lungo il suo ciclo di vita. */
export default mutation({
  args: {
    secret: v.string(),
    requestId: v.id("matchRequests"),
    status: matchRequestStatus,
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
