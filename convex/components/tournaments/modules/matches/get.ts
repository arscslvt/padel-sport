import { v } from "convex/values";
import { query } from "../../_generated/server";

const hydratedMatchValidator = v.object({
  _id: v.id("matches"),
  status: v.union(
    v.literal("scheduled"),
    v.literal("in_progress"),
    v.literal("finished"),
  ),
  scheduledAt: v.optional(v.string()),
  points: v.object({
    teamA: v.number(),
    teamB: v.number(),
  }),
  teams: v.array(
    v.object({
      name: v.string(),
      players: v.array(
        v.object({
          name: v.string(),
        }),
      ),
    }),
  ),
});

export const getMatchesByGroupId = query({
  args: {
    groupId: v.id("groups"),
    teamName: v.optional(v.string()),
  },
  returns: v.array(hydratedMatchValidator),
  async handler(ctx, args) {
    const { groupId } = args;

    const mapStatus = (
      status: "scheduled" | "live" | "completed",
    ): "scheduled" | "in_progress" | "finished" => {
      if (status === "live") {
        return "in_progress";
      }

      if (status === "completed") {
        return "finished";
      }

      return "scheduled";
    };

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    const hydrateTeam = async (
      tournamentTeamId: (typeof matches)[number]["tournamentTeamAId"],
    ) => {
      const tournamentTeam = await ctx.db.get(tournamentTeamId);
      if (!tournamentTeam) {
        return {
          name: "Squadra sconosciuta",
          players: [],
        };
      }

      const team = await ctx.db.get(tournamentTeam.teamId);
      if (!team) {
        return {
          name: "Squadra sconosciuta",
          players: [],
        };
      }

      const players = (
        await Promise.all(
          team.playersIds.map((playerId) => ctx.db.get(playerId)),
        )
      ).filter((player) => player !== null);

      return {
        name: team.name ?? "Squadra senza nome",
        players: players.map((player) => ({
          name: [player.firstName, player.lastName].filter(Boolean).join(" "),
        })),
      };
    };

    const hydratedMatches = await Promise.all(
      matches.map(async (match) => {
        const [teamA, teamB] = await Promise.all([
          hydrateTeam(match.tournamentTeamAId),
          hydrateTeam(match.tournamentTeamBId),
        ]);

        const points = match.sets.reduce(
          (acc, set) => {
            if (set.teamAPoints > set.teamBPoints) {
              acc.teamA += 1;
            } else if (set.teamBPoints > set.teamAPoints) {
              acc.teamB += 1;
            }
            return acc;
          },
          { teamA: 0, teamB: 0 },
        );

        return {
          _id: match._id,
          status: mapStatus(match.status),
          scheduledAt: match.dateStart,
          points,
          teams: [teamA, teamB],
        };
      }),
    );

    // Filter by team name or player name if provided
    if (!args.teamName) {
      return hydratedMatches;
    }

    const searchTerm = args.teamName.toLowerCase();
    return hydratedMatches.filter((match) =>
      match.teams.some(
        (team) =>
          team.name.toLowerCase().includes(searchTerm) ||
          team.players.some((player) =>
            player.name.toLowerCase().includes(searchTerm),
          ),
      ),
    );
  },
});
