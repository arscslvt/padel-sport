import { defineTable } from "convex/server";
import { v } from "convex/values";

export default defineTable({
  tournamentCategoryId: v.id("tournamentCategories"),
  stage: v.union(v.literal("quarter"), v.literal("semi"), v.literal("final")),
  qualifiedTeamIds: v.array(v.id("tournamentTeams")),
  updatedAt: v.number(),
}).index("by_category_and_stage", ["tournamentCategoryId", "stage"]);
