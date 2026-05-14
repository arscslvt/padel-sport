import { v } from "convex/values";
import { query } from "../../_generated/server";
import schema from "../../schema";
import { doc } from "convex-helpers/validators";

export const getGroupsByTournamentCategoryId = query({
  args: {
    tournamentCategoryId: v.id("tournamentCategories"),
  },
  returns: v.array(doc(schema, "groups")),
  async handler(ctx, args) {
    const { tournamentCategoryId } = args;

    const groups = await ctx.db
      .query("groups")
      .withIndex("by_tournamentCategoryId", (q) =>
        q.eq("tournamentCategoryId", tournamentCategoryId),
      )
      .collect();

    return groups;
  },
});
