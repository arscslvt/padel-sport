import { v } from "convex/values";
import { mutation } from "../../_generated/server";

const editByTeamIds = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    team1Id: v.id("teams"),
    team2Id: v.id("teams"),
    data: v.any(),
  },
  async handler(ctx, args) {
    const categories = await ctx.db
      .query("tournamentCategories")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId),
      )
      .collect();

    let team1TournamentTeam = null;
    let team2TournamentTeam = null;

    for (const category of categories) {
      if (!team1TournamentTeam) {
        team1TournamentTeam = await ctx.db
          .query("tournamentTeams")
          .withIndex("by_tournamentCategory_and_team", (q) =>
            q
              .eq("tournamentCategoryId", category._id)
              .eq("teamId", args.team1Id),
          )
          .first();
      }

      if (!team2TournamentTeam) {
        team2TournamentTeam = await ctx.db
          .query("tournamentTeams")
          .withIndex("by_tournamentCategory_and_team", (q) =>
            q
              .eq("tournamentCategoryId", category._id)
              .eq("teamId", args.team2Id),
          )
          .first();
      }
    }

    if (!team1TournamentTeam || !team2TournamentTeam) {
      throw new Error(
        "One or both teams are not registered in this tournament",
      );
    }

    let match = await ctx.db
      .query("matches")
      .withIndex("by_tournamentTeams", (q) =>
        q
          .eq("tournamentTeamAId", team1TournamentTeam._id)
          .eq("tournamentTeamBId", team2TournamentTeam._id),
      )
      .first();

    if (!match) {
      match = await ctx.db
        .query("matches")
        .withIndex("by_tournamentTeams", (q) =>
          q
            .eq("tournamentTeamAId", team2TournamentTeam._id)
            .eq("tournamentTeamBId", team1TournamentTeam._id),
        )
        .first();
    }

    if (!match) {
      throw new Error("Match not found between these teams");
    }

    const { _id, _creationTime, ...updateData } = args.data;

    await ctx.db.patch(match._id, updateData);
  },
});

export { editByTeamIds };

const editById = mutation({
  args: {
    matchId: v.id("matches"),
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("completed"),
    )),
    stage: v.optional(v.union(
      v.literal("group"),
      v.literal("round16"),
      v.literal("quarter"),
      v.literal("semi"),
      v.literal("final"),
    )),
    sets: v.optional(v.array(
      v.object({
        teamAPoints: v.number(),
        teamBPoints: v.number(),
      })
    )),
    dateStart: v.optional(v.string()),
    comment: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const { matchId, ...updateData } = args;
    await ctx.db.patch(matchId, updateData);
  }
});

export { editById };
