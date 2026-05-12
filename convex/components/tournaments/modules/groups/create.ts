import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export const createGroup = mutation({
  args: {
    tournamentCategoryId: v.id("tournamentCategories"),
    name: v.string(),
  },
  async handler(ctx, args_0) {
    const { tournamentCategoryId, name } = args_0;

    const group = await ctx.db.insert("groups", {
      tournamentCategoryId,
      name,
    });

    return group;
  },
});
