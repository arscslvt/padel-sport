import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { clubQuery } from "../../../functions";

export const getGroupsByTournamentCategory = clubQuery({
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

export const getGroupMatches = clubQuery({
  args: {
    groupId: v.string(),
    teamName: v.optional(v.string()),
  },
  async handler(ctx, args) {
    return await ctx.runQuery(
      components.tournaments.modules.matches.get.getMatchesByGroupId,
      {
        groupId: args.groupId,
        teamName: args.teamName,
      },
    );
  },
});

export const getGroupStandings = clubQuery({
  args: {
    groupId: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.runQuery(
      components.tournaments.modules.groups.get.getGroupStandings,
      {
        groupId: args.groupId,
      },
    );
  },
});
