import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requirePlayer } from "../openMatches/lib";
import { membershipOf, requireCircleOwner } from "./lib";

/**
 * Toglie qualcuno dalla cerchia: un membro già dentro oppure un invito
 * ancora in sospeso. Solo il proprietario.
 *
 * Chi viene rimosso resta nelle partite di cerchia a cui si era già unito: il
 * campo è prenotato e togliergli il posto all'ultimo sarebbe peggio.
 */
export default mutation({
  args: {
    circleId: v.id("circles"),
    playerId: v.id("players"),
  },
  handler: async (ctx, { circleId, playerId }) => {
    const player = await requirePlayer(ctx);
    const circle = await requireCircleOwner(ctx, circleId, player._id);

    if (playerId === circle.ownerId) {
      throw new Error(
        "Non puoi rimuovere te stesso: per chiudere la cerchia devi scioglierla.",
      );
    }

    const membership = await membershipOf(ctx, circleId, playerId);
    if (membership) {
      await ctx.db.delete(membership._id);
      return { status: "removed" as const };
    }

    const invite = await ctx.db
      .query("circleInvites")
      .withIndex("by_circle_invitee", (q) =>
        q.eq("circleId", circleId).eq("inviteeId", playerId),
      )
      .collect();

    const pending = invite.find((row) => row.status === "pending");
    if (!pending) {
      throw new Error("Questo giocatore non fa parte della cerchia.");
    }

    await ctx.db.patch(pending._id, {
      status: "cancelled",
      respondedAt: Date.now(),
    });

    return { status: "invite_cancelled" as const };
  },
});
