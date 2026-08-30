import { v } from "convex/values";
import { components, internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";
import { triggerKeyFor } from "../../social/lib";

export const editMatch = mutation({
  args: {
    matchId: v.string(),
    status: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("live"),
        v.literal("completed"),
      ),
    ),
    stage: v.optional(
      v.union(
        v.literal("group"),
        v.literal("round16"),
        v.literal("quarter"),
        v.literal("semi"),
        v.literal("final"),
      ),
    ),
    sets: v.optional(
      v.array(
        v.object({
          teamAPoints: v.number(),
          teamBPoints: v.number(),
        }),
      ),
    ),
    dateStart: v.optional(v.union(v.string(), v.null())),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { matchId, ...rest } = args;
    await ctx.runMutation(
      components.tournaments.modules.matches.edit.editById,
      {
        matchId: matchId as never,
        ...rest,
      },
    );

    /**
     * Il racconto di una partita finita parte da qui, e non dal componente.
     *
     * Le mutation dentro `components/tournaments/` non vedono l'`internal.`
     * dell'app che le ospita: da lì non si può accodare niente. Questo wrapper
     * è il primo punto in cui il risultato è salvato e la coda è raggiungibile.
     *
     * Solo quando la partita passa a conclusa: le modifiche a un incontro in
     * corso — un set corretto, l'orario spostato — non sono una notizia.
     */
    if (rest.status === "completed") {
      await ctx.scheduler.runAfter(0, internal.modules.social.enqueue.default, {
        kind: "tournament_result",
        triggerKey: triggerKeyFor({ kind: "tournament_result", matchId }),
        subjectId: matchId,
      });
    }
  },
});
