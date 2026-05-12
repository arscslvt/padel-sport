import { v } from "convex/values";
import { doc } from "convex-helpers/validators";
import { query } from "../../_generated/server";
import schema from "../../schema";

const byTournamentId = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: v.array(doc(schema, "tournamentCategories")),
  async handler(ctx, args_0) {
    const { tournamentId } = args_0;

    const categories = await ctx.db
      .query("tournamentCategories")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    return categories;
  },
});

export { byTournamentId };
