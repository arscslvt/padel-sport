import { defineTable } from "convex/server";
import { v } from "convex/values";

export default defineTable({
  tournamentCategoryId: v.id("tournamentCategories"),
  teamId: v.id("teams"),
}).index("by_tournamentCategory_and_team", ["tournamentCategoryId", "teamId"]);
