import { defineTable } from "convex/server";
import { v } from "convex/values";

const groups = defineTable({
  tournamentCategoryId: v.id("tournamentCategories"),
  name: v.string(),
})
  .index("by_tournamentCategoryId", ["tournamentCategoryId"])
  .searchIndex("search_by_name", {
    searchField: "name",
  });

export default groups;
