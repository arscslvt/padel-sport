import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";

export default mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  async handler(ctx, args_0) {
    const existingPlayers = await ctx.runQuery(
      components.tournaments.modules.players.get.byFullName,
      {
        firstName: args_0.firstName,
        lastName: args_0.lastName,
      },
    );

    if (existingPlayers.length > 0) {
      throw new Error(
        `Player with name ${args_0.firstName} ${args_0.lastName} already exists. If this is a different player, please provide a different name or check the existing players list.`,
      );
    }

    const playerId = await ctx.runMutation(
      components.tournaments.modules.players.add.default,
      {
        firstName: args_0.firstName,
        lastName: args_0.lastName,
        email: args_0.email,
        image: args_0.image,
      },
    );

    return playerId;
  },
});
