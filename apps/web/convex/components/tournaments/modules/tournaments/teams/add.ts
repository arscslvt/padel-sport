import { v } from "convex/values";
import { mutation } from "../../../_generated/server";

export default mutation({
  args: {
    tournamentCategoryId: v.id("tournamentCategories"),
    teamId: v.id("teams"),
  },
  async handler(ctx, args) {
    const { tournamentCategoryId, teamId } = args;

    const existingEntry = await ctx.db
      .query("tournamentTeams")
      .withIndex("by_tournamentCategory_and_team", (q) =>
        q.eq("tournamentCategoryId", tournamentCategoryId).eq("teamId", teamId),
      )
      .first();

    if (existingEntry) {
      throw new Error("This team is already registered in this category.");
    }

    const tournamentTeamId = await ctx.db.insert("tournamentTeams", {
      tournamentCategoryId,
      teamId,
    });

    return tournamentTeamId;
  },
});
