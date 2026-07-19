import { defineTable } from "convex/server";
import { v } from "convex/values";

export default defineTable({
  tournamentCategoryId: v.id("tournamentCategories"),

  groupId: v.optional(v.id("groups")),

  status: v.union(
    v.literal("scheduled"),
    v.literal("live"),
    v.literal("completed"),
  ),

  stage: v.union(
    v.literal("group"),
    v.literal("round16"),
    v.literal("quarter"),
    v.literal("semi"),
    v.literal("final"),
  ),

  // Stable ordering and provenance are used to render the bracket and to
  // advance winners without relying on database insertion order.
  bracketPosition: v.optional(v.number()),
  sourceMatchAId: v.optional(v.id("matches")),
  sourceMatchBId: v.optional(v.id("matches")),

  tournamentTeamAId: v.id("tournamentTeams"),
  tournamentTeamBId: v.id("tournamentTeams"),

  sets: v.array(
    v.object({
      teamAPoints: v.number(),
      teamBPoints: v.number(),
    }),
  ),

  mvpPlayerId: v.optional(v.id("players")),

  comment: v.optional(v.string()),
  dateStart: v.optional(v.string()),
})
  .index("by_tournamentCategory_and_stage", ["tournamentCategoryId", "stage"])
  .index("by_tournamentTeams", ["tournamentTeamAId", "tournamentTeamBId"])
  .index("by_group", ["groupId"]);
