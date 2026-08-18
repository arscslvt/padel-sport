import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requirePlayer } from "../openMatches/lib";
import { requireCircleMember } from "./lib";

/**
 * Esce da una cerchia.
 *
 * Il proprietario non può uscire: la cerchia è sua e resterebbe senza nessuno
 * che possa gestirla, quindi deve scioglierla (modules/circles/dissolve.ts).
 *
 * Le partite di cerchia a cui si era già uniti restano: il campo è prenotato e
 * gli altri contano su quel giocatore.
 */
export default mutation({
  args: { circleId: v.id("circles") },
  handler: async (ctx, { circleId }) => {
    const player = await requirePlayer(ctx);
    const { circle, membership } = await requireCircleMember(
      ctx,
      circleId,
      player._id,
    );

    if (circle.ownerId === player._id) {
      throw new Error(
        "Hai creato tu questa cerchia: puoi solo scioglierla, non uscirne.",
      );
    }

    await ctx.db.delete(membership._id);

    return { circleId };
  },
});
