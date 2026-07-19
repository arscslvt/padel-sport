import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export const generateMatches = mutation({
  args: {
    groupId: v.id("groups"),
  },
  async handler(ctx, args_0) {
    const { groupId } = args_0;

    // Fetch group
    const group = await ctx.db.get(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Fetch teams in the group
    const groupTeams = await ctx.db
      .query("groupTeams")
      .withIndex("byGroupId", (q) => q.eq("groupId", groupId))
      .collect();

    if (groupTeams.length < 2) {
      throw new Error("At least 2 teams are required to generate matches");
    }

    // Fetch existing matches for this group
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    const existingMatchups = new Set(
      existingMatches.map((m) => {
        return [m.tournamentTeamAId, m.tournamentTeamBId].sort().join("-");
      }),
    );

    // Generate round-robin matches
    const matches = [];
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        const team1Id = groupTeams[i].teamId;
        const team2Id = groupTeams[j].teamId;

        const matchupKey = [team1Id, team2Id].sort().join("-");

        if (!existingMatchups.has(matchupKey)) {
          const match = await ctx.db.insert("matches", {
            tournamentCategoryId: group.tournamentCategoryId,
            groupId: groupId,

            stage: "group",

            tournamentTeamAId: team1Id,
            tournamentTeamBId: team2Id,

            status: "scheduled",

            sets: [],
          });

          matches.push(match);
        }
      }
    }

    return {
      success: true,
      generatedMatches: matches.length,
      matches,
    };
  },
});
