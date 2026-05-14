import { defineTable } from "convex/server";
import { v } from "convex/values";

const groupStandings = defineTable({
  groupId: v.id("groups"),
  teamId: v.id("tournamentTeams"),

  points: v.number(),
  gamesWon: v.number(),
  gamesLost: v.number(),
});

export default groupStandings;
