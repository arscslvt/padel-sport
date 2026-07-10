import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";

type KnockoutStage = "quarter" | "semi" | "final";

const stageValidator = v.union(
  v.literal("quarter"),
  v.literal("semi"),
  v.literal("final"),
);

const stageStandingValidator = v.object({
  id: v.string(),
  position: v.number(),
  team: v.string(),
  slot: v.optional(v.string()),
  games: v.number(),
  pts: v.number(),
  victories: v.number(),
  defeats: v.number(),
  dg: v.number(),
});

const stageSelectionValidator = v.object({
  _id: v.id("categoryStageSelections"),
  _creationTime: v.number(),
  tournamentCategoryId: v.id("tournamentCategories"),
  stage: stageValidator,
  qualifiedTeamIds: v.array(v.id("tournamentTeams")),
  updatedAt: v.number(),
});

async function getStandingsForCategory(
  ctx: QueryCtx | MutationCtx,
  tournamentCategoryId: Id<"tournamentCategories">,
) {
  const groups = await ctx.db
    .query("groups")
    .withIndex("by_tournamentCategoryId", (q) =>
      q.eq("tournamentCategoryId", tournamentCategoryId),
    )
    .collect();

  const rows = await Promise.all(
    groups.map(async (group) => {
      const groupTeams = await ctx.db
        .query("groupTeams")
        .withIndex("byGroupId", (q) => q.eq("groupId", group._id))
        .collect();
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();

      const stats = new Map<
        Id<"tournamentTeams">,
        {
          id: Id<"tournamentTeams">;
          team: string;
          slot: string;
          games: number;
          pts: number;
          victories: number;
          defeats: number;
          dg: number;
        }
      >();

      for (const groupTeam of groupTeams) {
        const tournamentTeam = await ctx.db.get(groupTeam.teamId);
        const team = tournamentTeam
          ? await ctx.db.get(tournamentTeam.teamId)
          : null;
        stats.set(groupTeam.teamId, {
          id: groupTeam.teamId,
          team: team?.name ?? "Squadra",
          slot: group.name,
          games: 0,
          pts: 0,
          victories: 0,
          defeats: 0,
          dg: 0,
        });
      }

      for (const match of matches) {
        if (match.status !== "completed") continue;
        const teamA = stats.get(match.tournamentTeamAId);
        const teamB = stats.get(match.tournamentTeamBId);
        if (!teamA || !teamB) continue;

        let setsA = 0;
        let setsB = 0;
        for (const set of match.sets) {
          teamA.dg += set.teamAPoints - set.teamBPoints;
          teamB.dg += set.teamBPoints - set.teamAPoints;
          if (set.teamAPoints > set.teamBPoints) setsA += 1;
          if (set.teamBPoints > set.teamAPoints) setsB += 1;
        }
        teamA.games += 1;
        teamB.games += 1;
        teamA.pts += setsA;
        teamB.pts += setsB;
        if (setsA > setsB) {
          teamA.victories += 1;
          teamB.defeats += 1;
        } else if (setsB > setsA) {
          teamB.victories += 1;
          teamA.defeats += 1;
        }
      }

      return [...stats.values()].sort(compareStandingRows);
    }),
  );

  return rows
    .flat()
    .sort(compareStandingRows)
    .map((standing, index) => ({ ...standing, position: index + 1 }));
}

function compareStandingRows(
  a: { pts: number; dg: number; victories: number; team: string },
  b: { pts: number; dg: number; victories: number; team: string },
) {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.dg !== a.dg) return b.dg - a.dg;
  if (b.victories !== a.victories) return b.victories - a.victories;
  return a.team.localeCompare(b.team);
}

function winnerOf(match: Doc<"matches">) {
  let setsA = 0;
  let setsB = 0;
  for (const set of match.sets) {
    if (set.teamAPoints > set.teamBPoints) setsA += 1;
    if (set.teamBPoints > set.teamAPoints) setsB += 1;
  }
  if (setsA === setsB) return null;
  return setsA > setsB ? match.tournamentTeamAId : match.tournamentTeamBId;
}

const previousStage: Partial<Record<KnockoutStage, KnockoutStage>> = {
  semi: "quarter",
  final: "semi",
};

const expectedTeams: Record<KnockoutStage, number> = {
  quarter: 8,
  semi: 4,
  final: 2,
};

// Standard seeding keeps 1/2 apart until the final and 1/4 apart until a semi.
function seededPairs(teamIds: Id<"tournamentTeams">[]) {
  if (teamIds.length === 8) {
    return [
      [teamIds[0], teamIds[7]],
      [teamIds[3], teamIds[4]],
      [teamIds[1], teamIds[6]],
      [teamIds[2], teamIds[5]],
    ] as const;
  }
  return teamIds.reduce<Array<[Id<"tournamentTeams">, Id<"tournamentTeams">]>>(
    (pairs, teamId, index) => {
      if (index % 2 === 0 && teamIds[index + 1]) {
        pairs.push([teamId, teamIds[index + 1]]);
      }
      return pairs;
    },
    [],
  );
}

export const getCategoryStandings = query({
  args: { tournamentCategoryId: v.id("tournamentCategories") },
  returns: v.array(stageStandingValidator),
  handler: async (ctx, args) =>
    await getStandingsForCategory(ctx, args.tournamentCategoryId),
});

export const getSelectionByCategoryStage = query({
  args: {
    tournamentCategoryId: v.id("tournamentCategories"),
    stage: stageValidator,
  },
  returns: v.union(stageSelectionValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("categoryStageSelections")
      .withIndex("by_category_and_stage", (q) =>
        q
          .eq("tournamentCategoryId", args.tournamentCategoryId)
          .eq("stage", args.stage),
      )
      .first(),
});

export const saveSelectionByCategoryStage = mutation({
  args: {
    tournamentCategoryId: v.id("tournamentCategories"),
    stage: stageValidator,
    qualifiedTeamIds: v.array(v.id("tournamentTeams")),
  },
  returns: v.id("categoryStageSelections"),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.tournamentCategoryId);
    if (!category) throw new Error("Categoria non trovata.");

    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournamentCategory_and_stage", (q) =>
        q
          .eq("tournamentCategoryId", args.tournamentCategoryId)
          .eq("stage", args.stage),
      )
      .first();
    if (existingMatches) {
      throw new Error("La fase è già stata generata e non è più modificabile.");
    }

    const qualifiedTeamIds = [...new Set(args.qualifiedTeamIds)];
    for (const teamId of qualifiedTeamIds) {
      const tournamentTeam = await ctx.db.get(teamId);
      if (
        !tournamentTeam ||
        tournamentTeam.tournamentCategoryId !== args.tournamentCategoryId
      ) {
        throw new Error("Una delle squadre non appartiene alla categoria.");
      }
    }

    const existing = await ctx.db
      .query("categoryStageSelections")
      .withIndex("by_category_and_stage", (q) =>
        q
          .eq("tournamentCategoryId", args.tournamentCategoryId)
          .eq("stage", args.stage),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        qualifiedTeamIds,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("categoryStageSelections", {
      tournamentCategoryId: args.tournamentCategoryId,
      stage: args.stage,
      qualifiedTeamIds,
      updatedAt: Date.now(),
    });
  },
});

export const generateKnockoutMatches = mutation({
  args: {
    tournamentCategoryId: v.id("tournamentCategories"),
    stage: stageValidator,
  },
  returns: v.object({
    matchIds: v.array(v.id("matches")),
    generatedMatches: v.number(),
  }),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.tournamentCategoryId);
    if (!category) throw new Error("Categoria non trovata.");

    const existing = await ctx.db
      .query("matches")
      .withIndex("by_tournamentCategory_and_stage", (q) =>
        q
          .eq("tournamentCategoryId", args.tournamentCategoryId)
          .eq("stage", args.stage),
      )
      .first();
    if (existing) throw new Error("I match di questa fase esistono già.");

    let teams: Id<"tournamentTeams">[];
    let sources: Doc<"matches">[] = [];
    const sourceStage = previousStage[args.stage];
    if (sourceStage) {
      sources = await ctx.db
        .query("matches")
        .withIndex("by_tournamentCategory_and_stage", (q) =>
          q
            .eq("tournamentCategoryId", args.tournamentCategoryId)
            .eq("stage", sourceStage),
        )
        .collect();
      sources.sort(
        (a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0),
      );
      if (sources.length > 0) {
        if (sources.length !== expectedTeams[args.stage]) {
          throw new Error(
            "La fase precedente non contiene il numero atteso di match.",
          );
        }
        const winners = sources.map((match) => {
          if (match.status !== "completed") return null;
          return winnerOf(match);
        });
        if (winners.some((winner) => winner === null)) {
          throw new Error(
            "Completa tutti i match della fase precedente con un risultato valido.",
          );
        }
        teams = winners as Id<"tournamentTeams">[];
      } else {
        teams = await getSavedSelection(
          ctx,
          args.tournamentCategoryId,
          args.stage,
        );
      }
    } else {
      teams = await getSavedSelection(
        ctx,
        args.tournamentCategoryId,
        args.stage,
      );
    }

    if (sources.length === 0) {
      const standings = await getStandingsForCategory(
        ctx,
        args.tournamentCategoryId,
      );
      const position = new Map(standings.map((row) => [row.id, row.position]));
      teams.sort(
        (a, b) =>
          (position.get(a) ?? Number.MAX_SAFE_INTEGER) -
          (position.get(b) ?? Number.MAX_SAFE_INTEGER),
      );
    }

    if (teams.length !== expectedTeams[args.stage]) {
      throw new Error(
        `Per questa fase servono esattamente ${expectedTeams[args.stage]} squadre.`,
      );
    }

    const pairs = sources.length
      ? teams.reduce<Array<[Id<"tournamentTeams">, Id<"tournamentTeams">]>>(
          (result, team, index) => {
            if (index % 2 === 0) result.push([team, teams[index + 1]]);
            return result;
          },
          [],
        )
      : seededPairs(teams);

    const matchIds: Id<"matches">[] = [];
    for (const [index, [teamA, teamB]] of pairs.entries()) {
      matchIds.push(
        await ctx.db.insert("matches", {
          tournamentCategoryId: args.tournamentCategoryId,
          stage: args.stage,
          bracketPosition: index,
          sourceMatchAId: sources[index * 2]?._id,
          sourceMatchBId: sources[index * 2 + 1]?._id,
          status: "scheduled",
          tournamentTeamAId: teamA,
          tournamentTeamBId: teamB,
          sets: [],
        }),
      );
    }

    await ctx.db.patch(args.tournamentCategoryId, { currentStage: args.stage });
    await upsertSelection(ctx, args.tournamentCategoryId, args.stage, teams);
    return { matchIds, generatedMatches: matchIds.length };
  },
});

async function getSavedSelection(
  ctx: MutationCtx,
  tournamentCategoryId: Id<"tournamentCategories">,
  stage: KnockoutStage,
) {
  const selection = await ctx.db
    .query("categoryStageSelections")
    .withIndex("by_category_and_stage", (q) =>
      q.eq("tournamentCategoryId", tournamentCategoryId).eq("stage", stage),
    )
    .first();
  if (!selection) throw new Error("Salva prima le squadre qualificate.");
  return [...selection.qualifiedTeamIds];
}

async function upsertSelection(
  ctx: MutationCtx,
  tournamentCategoryId: Id<"tournamentCategories">,
  stage: KnockoutStage,
  qualifiedTeamIds: Id<"tournamentTeams">[],
) {
  const existing = await ctx.db
    .query("categoryStageSelections")
    .withIndex("by_category_and_stage", (q) =>
      q.eq("tournamentCategoryId", tournamentCategoryId).eq("stage", stage),
    )
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, {
      qualifiedTeamIds,
      updatedAt: Date.now(),
    });
  } else {
    await ctx.db.insert("categoryStageSelections", {
      tournamentCategoryId,
      stage,
      qualifiedTeamIds,
      updatedAt: Date.now(),
    });
  }
}
