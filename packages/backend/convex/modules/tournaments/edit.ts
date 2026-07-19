import { components } from "@/convex/_generated/api";
import { mutation } from "@/convex/_generated/server";
import { v } from "convex/values";

export const editComment = mutation({
  args: {
    tournamentId: v.string(),
    comment: v.optional(
      v.object({
        title: v.string(),
        content: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { tournamentId, comment } = args;
    await ctx.runMutation(
      components.tournaments.modules.tournaments.edit.editComment,
      {
        tournamentId: tournamentId as any,
        comment,
      },
    );
  },
});
