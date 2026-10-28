import { components } from "../../../_generated/api";
import { clubQuery } from "../../../functions";
import { v } from "convex/values";

export const byTournamentId = clubQuery({
  args: {
    tournamentId: v.string(),
  },
  async handler(ctx, args_0) {
    const { tournamentId } = args_0;
    return await ctx.runQuery(
      components.tournaments.modules.categories.get.byTournamentId,
      { tournamentId },
    );
  },
});
