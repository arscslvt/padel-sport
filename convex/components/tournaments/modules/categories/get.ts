import { v } from "convex/values";
import { doc } from "convex-helpers/validators";
import { query } from "../../_generated/server";
import schema from "../../schema";

const categoryWithTeamsValidator = v.object({
  ...doc(schema, "tournamentCategories").fields,
  teams: v.array(doc(schema, "tournamentTeams")),
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
