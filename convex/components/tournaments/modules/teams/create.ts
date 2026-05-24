import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export default mutation({
  args: {
    name: v.string(),
    playersIds: v.array(v.id("players")),
    image: v.optional(v.string()),
  },
  async handler(ctx, args_0) {
    let teamName = args_0.name;
    if (!teamName) {
      const players = await Promise.all(
        args_0.playersIds.map((playerId) => ctx.db.get(playerId)),
      );
      teamName = players
        .filter((player) => player !== null)
        .map((player) => `${player.lastName} ${player.firstName?.charAt(0)}.`)
        .join(" / ");
    }

    const existingTeams = await ctx.db
      .query("teams")
      .withIndex("by_name", (q) => q.eq("name", teamName))
      .collect();

    if (existingTeams.length > 0) {
      throw new Error(`Esiste già una squadra con questo nome: ${teamName}`);
    }

    const teamId = await ctx.db.insert("teams", {
      name: teamName,
      playersIds: args_0.playersIds,
      image: args_0.image,
    });

    return teamId;
  },
});
