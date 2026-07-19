import { v } from "convex/values";
import { query } from "../../_generated/server";

const response = v.array(
  v.object({
    _id: v.id("teams"),
    _creationTime: v.number(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    playersIds: v.array(v.id("players")),
    players: v.array(
      v.object({
        _id: v.id("players"),
        _creationTime: v.number(),
        firstName: v.optional(v.string()),
        lastName: v.string(),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
      }),
    ),
  }),
);

const getTeamsByCategoryId = query({
  args: {
    categoryId: v.id("tournamentCategories"),
  },
  returns: response,
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
