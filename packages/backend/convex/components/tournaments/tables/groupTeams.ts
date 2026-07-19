import { defineTable } from "convex/server";
import { v } from "convex/values";

export default defineTable({
  groupId: v.id("groups"),
  teamId: v.id("tournamentTeams"),
})
  .index("byGroupId", ["groupId"])
  .index("byTeamId", ["teamId"])
  .index("byGroupAndTeam", ["groupId", "teamId"]);
