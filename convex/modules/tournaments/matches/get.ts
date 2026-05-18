import { v } from "convex/values";
import { components } from "@/convex/_generated/api";
import { query } from "@/convex/_generated/server";

export const getMatchByPlayerName = query({
  args: {
    playerName: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.runQuery(
      components.tournaments.modules.matches.get.getMatchByPlayerName,
      {
        playerName: args.playerName,
      },
    );
  },
});

export const getLiveMatchesByTournamentId = query({
  args: {
    tournamentId: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.runQuery(
      components.tournaments.modules.matches.get.getLiveMatchesByTournamentId,
      {
        tournamentId: args.tournamentId as any,
      },
    );
  },
});

export const getTodayCompletedMatchesByTournamentId = query({
  args: {
    tournamentId: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.runQuery(
      components.tournaments.modules.matches.get
        .getTodayCompletedMatchesByTournamentId,
      {
        tournamentId: args.tournamentId as any,
      },
    );
  },
});
