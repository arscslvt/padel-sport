import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requirePlayer, visibilityOf } from "../openMatches/lib";
import { membersOf, requireCircleOwner, upcomingCircleMatches } from "./lib";

/**
 * Scioglie la cerchia: via i membri, gli inviti e la cerchia stessa.
 *
 * Con partite ancora in programma l'operazione è bloccata: quelle partite
 * hanno un campo prenotato e dei giocatori che ci contano, e senza la cerchia
 * nessuno saprebbe più da dove arrivano. Vanno prima cancellate o aperte a
 * tutti (modules/openMatches/publish.ts).
 */
export default mutation({
  args: { circleId: v.id("circles") },
  handler: async (ctx, { circleId }) => {
    const player = await requirePlayer(ctx);
    await requireCircleOwner(ctx, circleId, player._id);

    // Le partite già aperte a tutti non sono più un problema: vivono da sole
    // fra le partite aperte e non hanno più bisogno della cerchia.
    const stillPrivate = (await upcomingCircleMatches(ctx, circleId)).filter(
      (match) => visibilityOf(match) === "circle",
    );

    if (stillPrivate.length > 0) {
      throw new Error(
        "Ci sono ancora partite riservate a questa cerchia: cancellale o rendile aperte prima di scioglierla.",
      );
    }

    const memberships = await membersOf(ctx, circleId);
    await Promise.all(memberships.map((row) => ctx.db.delete(row._id)));

    const invites = await ctx.db
      .query("circleInvites")
      .withIndex("by_circle_status", (q) => q.eq("circleId", circleId))
      .collect();
    await Promise.all(invites.map((row) => ctx.db.delete(row._id)));

    await ctx.db.delete(circleId);

    return { circleId };
  },
});
