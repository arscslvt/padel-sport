import { v } from "convex/values";
import { query } from "../../_generated/server";

export const getGroupsByTournamentCategoryId = query({
  args: {
    tournamentCategoryId: v.id("tournamentCategories"),
  },
  returns: v.array(
    v.object({
      _id: v.id("groups"),
      _creationTime: v.number(),
      name: v.string(),
      tournamentCategoryId: v.id("tournamentCategories"),
    }),
  ),
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

export const getGroupStandings = query({
  args: {
    groupId: v.id("groups"),
  },
  async handler(ctx, args) {
    const { groupId } = args;

    const groupTeams = await ctx.db
      .query("groupTeams")
      .withIndex("byGroupId", (q) => q.eq("groupId", groupId))
      .collect();

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    type TeamStat = {
      teamId: string;
      teamName: string | null;
      games: number;
      victories: number;
      defeats: number;
      dg: number;
      pts: number;
    };

    const stats: Record<string, TeamStat> = {};

    for (const groupTeam of groupTeams) {
      let teamName = "Team";
      const tournamentTeam = await ctx.db.get(groupTeam.teamId);
      if (tournamentTeam) {
        const team = await ctx.db.get(tournamentTeam.teamId);
        if (team) teamName = team.name ?? teamName;
      }

      stats[groupTeam.teamId] = {
        teamId: groupTeam.teamId,
        teamName,
        games: 0,
        victories: 0,
        defeats: 0,
        dg: 0,
        pts: 0,
      };
    }

    for (const match of matches) {
      if (match.status !== "completed") continue;

      const teamAStats = stats[match.tournamentTeamAId];
      const teamBStats = stats[match.tournamentTeamBId];

      if (!teamAStats || !teamBStats) continue;

      let teamASetsWon = 0;
      let teamBSetsWon = 0;
      let teamAGamesDiff = 0;
      let teamBGamesDiff = 0;

      for (const set of match.sets) {
        if (set.teamAPoints > set.teamBPoints) teamASetsWon++;
        else if (set.teamBPoints > set.teamAPoints) teamBSetsWon++;

        const diffA = set.teamAPoints - set.teamBPoints;
        const diffB = set.teamBPoints - set.teamAPoints;

        teamAGamesDiff += diffA;
        teamBGamesDiff += diffB;
      }

      teamAStats.games += 1;
      teamBStats.games += 1;

      teamAStats.dg += teamAGamesDiff;
      teamBStats.dg += teamBGamesDiff;

      if (teamASetsWon > teamBSetsWon) {
        teamAStats.victories += 1;
        teamBStats.defeats += 1;
      } else if (teamBSetsWon > teamASetsWon) {
        teamBStats.victories += 1;
        teamAStats.defeats += 1;
      }

      // Assign 1 point for each set won
      teamAStats.pts += teamASetsWon;
      teamBStats.pts += teamBSetsWon;
    }

    const sortedStats = Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts; // High points first
      if (b.dg !== a.dg) return b.dg - a.dg; // High difference first
      return b.victories - a.victories; // High victories first
    });

    return sortedStats.map((stat, i) => ({
      id: stat.teamId,
      position: i + 1,
      team: stat.teamName ?? "Team",
      games: stat.games,
      pts: stat.pts,
      victories: stat.victories,
      defeats: stat.defeats,
      dg: stat.dg,
    }));
  },
});
