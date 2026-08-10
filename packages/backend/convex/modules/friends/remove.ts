import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requirePlayer } from "../openMatches/lib";
import { friendshipBetween } from "./lib";

/**
 * Toglie l'amicizia con un giocatore, o ritira la richiesta inviata:
 * in entrambi i casi resta la possibilità di ricominciare da capo.
 */
export default mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await requirePlayer(ctx);

    const friendship = await friendshipBetween(ctx, player._id, playerId);
    if (!friendship) {
      throw new Error("Non siete amici.");
    }

    await ctx.db.delete(friendship._id);
  },
});
