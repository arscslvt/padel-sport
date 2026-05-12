import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export const deleteMatchesByGroupId = mutation({
  args: {
    groupId: v.id("groups"),
  },
  async handler(ctx, args_0) {
    const { groupId } = args_0;

    // Retrieve all matches associated with the group
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    // Delete each match
    for (const match of matches) {
      await ctx.db.delete(match._id);
    }

    return { success: true, deletedCount: matches.length };
  },
});
