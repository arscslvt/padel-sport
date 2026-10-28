import { v } from "convex/values";
import { components } from "../../_generated/api";
import { clubMutation, clubQuery } from "../../functions";

const stageValidator = v.union(
  v.literal("quarter"),
  v.literal("semi"),
  v.literal("final"),
);

export const getCategoryStandings = clubQuery({
  args: { tournamentCategoryId: v.string() },
  handler: async (ctx, args) =>
    await ctx.runQuery(
      components.tournaments.modules.advancements.getCategoryStandings,
      args,
    ),
});

export const getSelectionByCategoryStage = clubQuery({
  args: { tournamentCategoryId: v.string(), stage: stageValidator },
  handler: async (ctx, args) =>
    await ctx.runQuery(
      components.tournaments.modules.advancements.getSelectionByCategoryStage,
      args,
    ),
});

export const getKnockoutCandidatesByCategoryStage = clubQuery({
  args: { tournamentCategoryId: v.string(), stage: stageValidator },
  handler: async (ctx, args) =>
    await ctx.runQuery(
      components.tournaments.modules.advancements
        .getKnockoutCandidatesByCategoryStage,
      args,
    ),
});

export const saveSelectionByCategoryStage = clubMutation({
  args: {
    tournamentCategoryId: v.string(),
    stage: stageValidator,
    mode: v.optional(v.union(v.literal("smart"), v.literal("manual"))),
    qualifiedTeamIds: v.array(v.string()),
    manualPairings: v.optional(
      v.array(
        v.object({
          teamAId: v.string(),
          teamBId: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) =>
    await ctx.runMutation(
      components.tournaments.modules.advancements.saveSelectionByCategoryStage,
      args,
    ),
});

export const generateKnockoutMatches = clubMutation({
  args: {
    tournamentCategoryId: v.string(),
    stage: stageValidator,
  },
  handler: async (ctx, args) =>
    await ctx.runMutation(
      components.tournaments.modules.advancements.generateKnockoutMatches,
      args,
    ),
});

export const resetKnockoutMatches = clubMutation({
  args: {
    tournamentCategoryId: v.string(),
    stage: stageValidator,
  },
  handler: async (ctx, args) =>
    await ctx.runMutation(
      components.tournaments.modules.advancements.resetKnockoutMatches,
      args,
    ),
});
