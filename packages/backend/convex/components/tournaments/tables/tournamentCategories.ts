import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tournamentCategoriesTable = v.object({
  name: v.string(),
  slug: v.string(),
  icon: v.optional(v.string()),

  tournamentId: v.id("tournaments"),

  currentStage: v.union(
    v.literal("group"),
    v.literal("quarter"),
    v.literal("semi"),
    v.literal("final"),
    v.literal("completed"),
  ),
});
export type TournamentCategory = typeof tournamentCategoriesTable.type;

export default defineTable(tournamentCategoriesTable)
  .index("by_slug_and_tournament", ["slug", "tournamentId"])
  .index("by_tournament", ["tournamentId"])
  .index("by_currentStage", ["currentStage"])
  .searchIndex("search_by_name", { searchField: "name" });
