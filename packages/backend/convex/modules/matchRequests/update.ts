import { v } from "convex/values";
import { serverMutation } from "../../functions";
import { matchRequestStatus } from "../../tables/matchRequests";

/** Sposta una richiesta di giocatori lungo il suo ciclo di vita. */
export default serverMutation({
  args: {
    requestId: v.id("matchRequests"),
    status: matchRequestStatus,
  },
  handler: async (ctx, { requestId, status }) => {
    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Richiesta non trovata.");
    }

    await ctx.db.patch(requestId, { status });
  },
});
