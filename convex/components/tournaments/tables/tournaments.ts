import { defineTable } from "convex/server";
import { v } from "convex/values";

const tournaments = defineTable({
  name: v.string(),
  slug: v.string(),

  startDate: v.string(),
  endDate: v.optional(v.string()),
  status: v.union(
    v.literal("upcoming"),
    v.literal("live"),
    v.literal("completed"),
  ),
})
  .index("by_slug", ["slug"])
  .searchIndex("search_by_name", { searchField: "name" });

export default tournaments;
