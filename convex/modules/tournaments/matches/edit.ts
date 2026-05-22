import { components } from "@/convex/_generated/api";
import { mutation } from "@/convex/_generated/server";
import { v } from "convex/values";

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
    dateStart: v.optional(v.string()),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { matchId, ...rest } = args;
    await ctx.runMutation(
      components.tournaments.modules.matches.edit.editById,
      {
        matchId: matchId as any,
        ...rest,
      },
    );
  },
});
