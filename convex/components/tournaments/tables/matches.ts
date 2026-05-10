import { defineTable } from "convex/server";
import { v } from "convex/values";

export default defineTable({
  tournamentCategoryId: v.id("tournamentCategories"),

  groupId: v.optional(v.id("groups")),

  stage: v.union(
    v.literal("group"),
    v.literal("round16"),
    v.literal("quarter"),
    v.literal("semi"),
    v.literal("final"),
  ),

  teamAId: v.id("teams"),
  teamBId: v.id("teams"),

  sets: v.array(
    v.object({
      teamAPoints: v.number(),
      teamBPoints: v.number(),
    }),
  ),

  mvpPlayerId: v.optional(v.id("players")),

  comment: v.optional(v.string()),
})
  .index("by_tournamentCategory_and_stage", ["tournamentCategoryId", "stage"])
  .index("by_group", ["groupId"]);
