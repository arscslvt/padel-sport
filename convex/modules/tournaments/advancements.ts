import { v } from "convex/values";
import { components } from "@/convex/_generated/api";
import { mutation, query } from "@/convex/_generated/server";

const stageValidator = v.union(
  v.literal("quarter"),
  v.literal("semi"),
  v.literal("final"),
);

export const getCategoryStandings = query({
  args: { tournamentCategoryId: v.string() },
  handler: async (ctx, args) =>
    await ctx.runQuery(
      components.tournaments.modules.advancements.getCategoryStandings,
      args,
    ),
});

export const getSelectionByCategoryStage = query({
  args: { tournamentCategoryId: v.string(), stage: stageValidator },
  handler: async (ctx, args) =>
    await ctx.runQuery(
      components.tournaments.modules.advancements.getSelectionByCategoryStage,
      args,
    ),
});

export const saveSelectionByCategoryStage = mutation({
  args: {
    tournamentCategoryId: v.string(),
    stage: stageValidator,
    qualifiedTeamIds: v.array(v.string()),
  },
  handler: async (ctx, args) =>
    await ctx.runMutation(
      components.tournaments.modules.advancements.saveSelectionByCategoryStage,
      args,
    ),
});

export const generateKnockoutMatches = mutation({
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
