import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requirePlayer } from "../openMatches/lib";

/**
 * Risponde a una richiesta di amicizia ricevuta.
 *
 * Il rifiuto cancella la riga invece di conservarne lo stato: i due tornano
 * estranei e la richiesta si può rifare più avanti.
 */
export default mutation({
  args: {
    friendshipId: v.id("friendships"),
    accept: v.boolean(),
  },
  handler: async (ctx, { friendshipId, accept }) => {
    const player = await requirePlayer(ctx);

    const friendship = await ctx.db.get(friendshipId);
    if (!friendship) {
      throw new Error("Richiesta non trovata.");
    }

    if (friendship.addresseeId !== player._id) {
      throw new Error("Puoi rispondere solo alle richieste che ricevi.");
    }

    if (friendship.status !== "pending") {
      throw new Error("Hai già risposto a questa richiesta.");
    }

    if (!accept) {
      await ctx.db.delete(friendshipId);
      return { status: "declined" as const };
    }

    await ctx.db.patch(friendshipId, {
      status: "accepted",
      respondedAt: Date.now(),
    });

    return { status: "accepted" as const };
  },
});
