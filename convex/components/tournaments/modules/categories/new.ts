import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export default mutation({
  args: {
    name: v.string(),
    tournamentId: v.id("tournaments"),
    currentStage: v.optional(
      v.union(
        v.literal("group"),
        v.literal("quarter"),
        v.literal("semi"),
        v.literal("final"),
        v.literal("completed"),
      ),
    ),
  },
  async handler(ctx, args_0) {
    const { name, tournamentId, currentStage } = args_0;

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const existingCategory = await ctx.db
      .query("tournamentCategories")
      .withIndex("by_slug_and_tournament", (q) =>
        q.eq("slug", slug).eq("tournamentId", tournamentId),
      )
      .first();

    if (existingCategory) {
      throw new Error(
        "A category with this name already exists in this tournament.",
      );
    }

    const categoryId = await ctx.db.insert("tournamentCategories", {
      name,
      slug,
      tournamentId,
      currentStage: currentStage || "group",
    });

    return categoryId;
  },
});
