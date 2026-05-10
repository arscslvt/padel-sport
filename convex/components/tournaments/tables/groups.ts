import { defineTable } from "convex/server";
import { v } from "convex/values";

const groups = defineTable({
  tournamentCategoryId: v.id("tournamentCategories"),
  name: v.string(),
});

export default groups;
