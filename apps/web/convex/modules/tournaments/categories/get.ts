import { components } from "@/convex/_generated/api";
import { query } from "@/convex/_generated/server";
import { v } from "convex/values";

export const byTournamentId = query({
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
