import { defineTable } from "convex/server";
import { v } from "convex/values";

const teams = defineTable({
  name: v.optional(v.string()),
  playersIds: v.array(v.id("players")),
  image: v.optional(v.string()),
})
  .index("by_name", ["name"])
  .searchIndex("search_by_name", { searchField: "name" });

export default teams;
