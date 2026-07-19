import { v } from "convex/values";
import { query } from "../../_generated/server";

const categoryWithTeamsValidator = v.object({
  _id: v.id("tournamentCategories"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  icon: v.optional(v.string()),
  tournamentId: v.id("tournaments"),
  currentStage: v.union(
    v.literal("group"),
    v.literal("quarter"),
    v.literal("semi"),
    v.literal("final"),
    v.literal("completed"),
  ),
  teams: v.array(
    v.object({
      _id: v.id("tournamentTeams"),
      _creationTime: v.number(),
      tournamentCategoryId: v.id("tournamentCategories"),
      teamId: v.id("teams"),
    }),
  ),
});

const byTournamentId = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: v.array(categoryWithTeamsValidator),
  async handler(ctx, args_0) {
    const { tournamentId } = args_0;

    const categories = await ctx.db
      .query("tournamentCategories")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    const categoriesWithTeams = await Promise.all(
      categories.map(async (category) => {
        const teams = await ctx.db
          .query("tournamentTeams")
          .withIndex("by_tournamentCategory_and_team", (q) =>
            q.eq("tournamentCategoryId", category._id),
          )
          .collect();

        return {
          ...category,
          teams,
        };
      }),
    );

    return categoriesWithTeams;
  },
});

export { byTournamentId };
