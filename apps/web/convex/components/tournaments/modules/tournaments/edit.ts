import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export const editComment = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    comment: v.optional(
      v.object({
        title: v.string(),
        content: v.optional(v.string()),
      })
    ),
  },
  async handler(ctx, args) {
    const { tournamentId, comment } = args;
    await ctx.db.patch(tournamentId, { comment });
  },
});
