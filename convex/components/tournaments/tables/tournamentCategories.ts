import { defineTable } from "convex/server";
import { v } from "convex/values";

export default defineTable({
  name: v.string(),
  slug: v.string(),
  tournamentId: v.id("tournaments"),
})
  .index("by_slug_and_tournament", ["slug", "tournamentId"])
  .searchIndex("search_by_name", { searchField: "name" });
