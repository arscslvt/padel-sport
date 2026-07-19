import { v } from "convex/values";
import { mutation } from "../../../_generated/server";

const sync = mutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  async handler(ctx, args) {
    const { tournamentId } = args;

    const tournamentCategories = await ctx.db
      .query("tournamentCategories")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    let totalTeams = 0;

    for (const category of tournamentCategories) {
      const tournamentTeams = await ctx.db
        .query("tournamentTeams")
        .withIndex("by_tournamentCategory_and_team", (q) =>
          q.eq("tournamentCategoryId", category._id),
        )
        .collect();

      totalTeams += tournamentTeams.length;
    }

    await ctx.db.patch("tournaments", tournamentId, {
      teamsCount: totalTeams,
      categoriesCount: tournamentCategories.length,
    });
  },
});

export { sync };
