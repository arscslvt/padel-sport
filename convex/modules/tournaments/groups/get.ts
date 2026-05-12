import { v } from "convex/values";
import { components } from "@/convex/_generated/api";
import { query } from "@/convex/_generated/server";

export const getGroupsByTournamentCategory = query({
  args: {
    tournamentCategoryId: v.string(),
  },

  async handler(ctx, args) {
    return await ctx.runQuery(
      components.tournaments.modules.groups.get.getGroupsByTournamentCategoryId,
      {
        tournamentCategoryId: args.tournamentCategoryId,
      },
    );
  },
});

export const getGroupMatches = query({
  args: {
    groupId: v.string(),
  },

  async handler(ctx, args) {
    return await ctx.runQuery(
      components.tournaments.modules.matches.get.getMatchesByGroupId,
      {
        groupId: args.groupId,
      },
    );
  },
});
