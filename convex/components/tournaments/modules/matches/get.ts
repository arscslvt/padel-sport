import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { query } from "../../_generated/server";

export const hydratedMatchValidator = v.object({
  _id: v.id("matches"),
  status: v.union(
    v.literal("scheduled"),
    v.literal("in_progress"),
    v.literal("finished"),
  ),
  categoryId: v.optional(v.id("tournamentCategories")),
  categoryName: v.optional(v.string()),
  groupId: v.optional(v.id("groups")),
  groupName: v.optional(v.string()),
  stage: v.optional(v.string()),
  bracketPosition: v.optional(v.number()),
  scheduledAt: v.optional(v.string()),
  points: v.object({
    teamA: v.number(),
    teamB: v.number(),
  }),
  sets: v.array(
    v.object({
      teamAPoints: v.number(),
      teamBPoints: v.number(),
    }),
  ),
  teams: v.array(
    v.object({
      name: v.string(),
      players: v.array(
        v.object({
          name: v.string(),
          firstName: v.optional(v.string()),
          lastName: v.string(),
        }),
      ),
    }),
  ),
});

const mapStatus = (
  status: "scheduled" | "live" | "completed",
): "scheduled" | "in_progress" | "finished" => {
  if (status === "live") return "in_progress";
  if (status === "completed") return "finished";
  return "scheduled";
};

const getStatusPriority = (
  status: "scheduled" | "in_progress" | "finished",
) => {
  if (status === "in_progress") return 0;
  if (status === "finished") return 2;
  return 1;
};

const getDateSortValue = (scheduledAt: string | undefined) =>
  scheduledAt ? new Date(scheduledAt).getTime() : Number.POSITIVE_INFINITY;

async function hydrateMatches(ctx: QueryCtx, matches: Doc<"matches">[]) {
  const hydrateTeam = async (tournamentTeamId: Id<"tournamentTeams">) => {
    const tournamentTeam = await ctx.db.get(tournamentTeamId);
    if (!tournamentTeam) return { name: "Squadra sconosciuta", players: [] };

    const team = await ctx.db.get(tournamentTeam.teamId);
    if (!team) return { name: "Squadra sconosciuta", players: [] };

    const players = (
      await Promise.all(
        team.playersIds.map((playerId: Id<"players">) => ctx.db.get(playerId)),
      )
    ).filter((player: Doc<"players"> | null) => player !== null);

    return {
      name: team.name ?? "Squadra senza nome",
      players: players.map((player) => ({
        name: [player?.firstName, player?.lastName].filter(Boolean).join(" "),
        firstName: player?.firstName,
        lastName: player?.lastName ?? "",
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
        (
          acc: { teamA: number; teamB: number },
          set: { teamAPoints: number; teamBPoints: number },
        ) => {
          if (set.teamAPoints > set.teamBPoints) acc.teamA += 1;
          else if (set.teamBPoints > set.teamAPoints) acc.teamB += 1;
          return acc;
        },
        { teamA: 0, teamB: 0 },
      );

      const category = await ctx.db.get(match.tournamentCategoryId);
      const group = match.groupId ? await ctx.db.get(match.groupId) : null;

      return {
        _id: match._id,
        status: mapStatus(match.status),
        categoryId: match.tournamentCategoryId,
        categoryName: category?.name,
        groupId: match.groupId,
        groupName: group?.name,
        stage: match.stage,
        bracketPosition: match.bracketPosition,
        scheduledAt: match.dateStart,
        points,
        sets: match.sets,
        teams: [teamA, teamB],
      };
    }),
  );

  hydratedMatches.sort((left, right) => {
    const statusDifference =
      getStatusPriority(left.status) - getStatusPriority(right.status);
    if (statusDifference !== 0) return statusDifference;
    return (
      getDateSortValue(left.scheduledAt) - getDateSortValue(right.scheduledAt)
    );
  });

  return hydratedMatches;
}

const getMatchesByGroupId = query({
  args: {
    groupId: v.id("groups"),
    teamName: v.optional(v.string()),
  },
  returns: v.array(hydratedMatchValidator),
  async handler(ctx, args) {
    const { groupId } = args;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    const hydratedMatches = await hydrateMatches(ctx, matches);

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

const getMatchByPlayerName = query({
  args: {
    playerName: v.string(),
  },
  returns: v.array(hydratedMatchValidator),
  async handler(ctx, args) {
    if (!args.playerName || args.playerName.trim() === "") {
      return [];
    }
    const searchTerm = args.playerName.toLowerCase();

    const matches = await ctx.db.query("matches").collect();

    const filteredMatches = [];

    for (const match of matches) {
      const tournamentTeamA = await ctx.db.get(match.tournamentTeamAId);
      const tournamentTeamB = await ctx.db.get(match.tournamentTeamBId);
      if (!tournamentTeamA || !tournamentTeamB) {
        continue;
      }

      const teamA = await ctx.db.get(tournamentTeamA.teamId);
      const teamB = await ctx.db.get(tournamentTeamB.teamId);
      if (!teamA || !teamB) {
        continue;
      }

      const playersA = await Promise.all(
        teamA.playersIds.map((playerId) => ctx.db.get(playerId)),
      );
      const playersB = await Promise.all(
        teamB.playersIds.map((playerId) => ctx.db.get(playerId)),
      );

      const allPlayers = [...playersA, ...playersB].filter(
        (player): player is NonNullable<typeof player> => player !== null,
      );

      if (
        allPlayers.some((player) => {
          const fullName = [player.firstName, player.lastName]
            .filter(Boolean)
            .join(" ");
          return fullName.toLowerCase().includes(searchTerm);
        })
      ) {
        filteredMatches.push(match);
      }
    }

    return await hydrateMatches(ctx, filteredMatches);
  },
});

const getMatchesByCategoryAndStage = query({
  args: {
    tournamentCategoryId: v.id("tournamentCategories"),
    stage: v.union(v.literal("quarter"), v.literal("semi"), v.literal("final")),
  },
  returns: v.array(hydratedMatchValidator),
  async handler(ctx, args) {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournamentCategory_and_stage", (q) =>
        q
          .eq("tournamentCategoryId", args.tournamentCategoryId)
          .eq("stage", args.stage),
      )
      .collect();

    return await hydrateMatches(ctx, matches);
  },
});

export const getLiveMatchesByTournamentId = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: v.array(hydratedMatchValidator),
  async handler(ctx, args) {
    const categories = await ctx.db
      .query("tournamentCategories")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId),
      )
      .collect();

    const categoryIds = categories.map((c) => c._id);
    let liveMatches: Doc<"matches">[] = [];

    for (const categoryId of categoryIds) {
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournamentCategory_and_stage", (q) =>
          q.eq("tournamentCategoryId", categoryId),
        )
        .filter((q) => q.eq(q.field("status"), "live"))
        .collect();

      liveMatches = liveMatches.concat(matches);
    }

    return await hydrateMatches(ctx, liveMatches);
  },
});

export const getTodayCompletedMatchesByTournamentId = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: v.array(hydratedMatchValidator),
  async handler(ctx, args) {
    const categories = await ctx.db
      .query("tournamentCategories")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId),
      )
      .collect();

    const categoryIds = categories.map((c) => c._id);
    let completedMatches: Doc<"matches">[] = [];

    for (const categoryId of categoryIds) {
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournamentCategory_and_stage", (q) =>
          q.eq("tournamentCategoryId", categoryId),
        )
        .filter((q) => q.eq(q.field("status"), "completed"))
        .collect();

      const now = new Date();
      const matchesToKeep = matches.filter((match) => {
        try {
          const matchDate = match.dateStart
            ? new Date(match.dateStart)
            : new Date(match._creationTime);
          return (
            matchDate.getDate() === now.getDate() &&
            matchDate.getMonth() === now.getMonth() &&
            matchDate.getFullYear() === now.getFullYear()
          );
        } catch {
          return false;
        }
      });

      completedMatches = completedMatches.concat(matchesToKeep);
    }

    return await hydrateMatches(ctx, completedMatches);
  },
});

export {
  getMatchesByGroupId,
  getMatchByPlayerName,
  getMatchesByCategoryAndStage,
};

export const getAllByTournamentId = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("tournamentCategories")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId),
      )
      .collect();
    const categoryIds = categories.map((c) => c._id);
    let allMatches: Doc<"matches">[] = [];
    for (const catId of categoryIds) {
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournamentCategory_and_stage", (q) =>
          q.eq("tournamentCategoryId", catId),
        )
        .collect();
      allMatches = allMatches.concat(matches);
    }
    return await hydrateMatches(ctx, allMatches);
  },
});
