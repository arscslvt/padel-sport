import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { query } from "../../../_generated/server";

const getTeamsByCategoryId = query({
  args: {
    categoryId: v.string(),
  },
  async handler(ctx, args_0) {
    return await ctx.runQuery(
      components.tournaments.modules.teams.get.getTeamsByCategoryId,
      {
        categoryId: args_0.categoryId,
      },
    );
  },
});

export { getTeamsByCategoryId };
