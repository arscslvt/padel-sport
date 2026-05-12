import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export const assignTeamToGroup = mutation({
  args: {
    groupId: v.id("groups"),
    teamId: v.id("tournamentTeams"),
  },
  async handler(ctx, args_0) {
    const { groupId, teamId } = args_0;

    const existingAssignment = await ctx.db
      .query("groupTeams")
      .withIndex("byGroupAndTeam", (q) =>
        q.eq("groupId", groupId).eq("teamId", teamId),
      )
      .first();

    if (existingAssignment) {
      throw new Error("La squadra è già assegnata a questo gruppo.");
    }

    const assignment = await ctx.db.insert("groupTeams", {
      groupId,
      teamId,
    });

    return assignment;
  },
});
