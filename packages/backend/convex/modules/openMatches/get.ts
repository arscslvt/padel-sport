import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getIdentityPlayer, toMatchView } from "./lib";

/**
 * Dettaglio di una partita aperta, con lo stato del viewer
 * (membro, creatore, richiesta in corso) per pilotare la CTA dell'app.
 */
export default query({
  args: { matchId: v.id("openMatches") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match) return null;

    const view = await toMatchView(ctx, match);

    const player = await getIdentityPlayer(ctx);

    let requestStatus:
      | "pending"
      | "accepted"
      | "declined"
      | "cancelled"
      | null = null;
    if (player) {
      const requests = await ctx.db
        .query("joinRequests")
        .withIndex("by_match_player", (q) =>
          q.eq("matchId", matchId).eq("playerId", player._id),
        )
        .collect();

      // Conta l'ultima richiesta non annullata
      const latest = requests
        .filter((r) => r.status !== "cancelled")
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      requestStatus = latest ? latest.status : null;
    }

    return {
      ...view,
      viewer: {
        playerId: player?._id ?? null,
        isMember: player ? match.playerIds.includes(player._id) : false,
        isCreator: player ? match.creatorId === player._id : false,
        levelOk: player
          ? player.level >= match.levelMin && player.level <= match.levelMax
          : null,
        requestStatus,
      },
    };
  },
});
