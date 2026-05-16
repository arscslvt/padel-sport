import { v } from "convex/values";
import { query } from "../../_generated/server";

const getTeamsByCategoryId = query({
  args: {
    categoryId: v.id("tournamentCategories"),
  },
  async handler(ctx, args_0) {
    const tournamentTeams = await ctx.db
      .query("tournamentTeams")
      .withIndex("by_tournamentCategory_and_team", (q) =>
        q.eq("tournamentCategoryId", args_0.categoryId),
      )
      .collect();

    const teams = await Promise.all(
      tournamentTeams.map((tournamentTeam) =>
        ctx.db.get(tournamentTeam.teamId),
      ),
    );

    const teamsWithPlayers = await Promise.all(
      teams.map(async (team) => {
        if (!team) return null;

        const players = await Promise.all(
          team.playersIds.map((playerId) => ctx.db.get(playerId)),
        );

        return {
          ...team,
          players: players.filter(
            (player): player is NonNullable<typeof player> => player !== null,
          ),
        };
      }),
    );

    return teamsWithPlayers.filter(
      (team): team is NonNullable<typeof team> => team !== null,
    );
  },
});

export { getTeamsByCategoryId };
