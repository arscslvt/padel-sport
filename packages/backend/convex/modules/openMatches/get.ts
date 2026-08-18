import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { membershipOf } from "../circles/lib";
import {
  getIdentityPlayer,
  type PlayerView,
  toMatchView,
  toPlayerView,
  visibilityOf,
} from "./lib";

export interface MatchInviteeView {
  inviteId: Id<"matchInvites">;
  player: PlayerView;
  status: "pending" | "accepted" | "declined" | "cancelled";
}

/**
 * Dettaglio di una partita aperta, con lo stato del viewer
 * (membro, creatore, richiesta in corso) per pilotare la CTA dell'app.
 *
 * Per le partite di cerchia arrivano anche gli invitati e la loro risposta:
 * è quello che dice al creatore se ha senso aspettare ancora o aprirla a tutti.
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

    const isCircleMatch = visibilityOf(match) === "circle";

    let inviteId: Id<"matchInvites"> | null = null;
    let inviteStatus: MatchInviteeView["status"] | null = null;
    let isCircleMember = false;

    if (player && match.circleId) {
      isCircleMember =
        (await membershipOf(ctx, match.circleId, player._id)) !== null;

      const invite = await ctx.db
        .query("matchInvites")
        .withIndex("by_match_player", (q) =>
          q.eq("matchId", matchId).eq("playerId", player._id),
        )
        .unique();

      if (invite) {
        inviteId = invite._id;
        inviteStatus = invite.status;
      }
    }

    // L'elenco degli invitati serve solo dove c'è una cerchia dietro
    const invitees: MatchInviteeView[] = [];

    if (match.circleId) {
      const invites = await ctx.db
        .query("matchInvites")
        .withIndex("by_match", (q) => q.eq("matchId", matchId))
        .collect();

      for (const invite of invites) {
        const invitee = await ctx.db.get(invite.playerId);
        if (!invitee) continue;

        invitees.push({
          inviteId: invite._id,
          player: toPlayerView(invitee),
          status: invite.status,
        });
      }

      invitees.sort((a, b) => a.player.name.localeCompare(b.player.name));
    }

    return {
      ...view,
      invitees,
      viewer: {
        playerId: player?._id ?? null,
        isMember: player ? match.playerIds.includes(player._id) : false,
        isCreator: player ? match.creatorId === player._id : false,
        levelOk: player
          ? // Dentro una cerchia il livello non blocca nessuno
            isCircleMatch ||
            (player.level >= match.levelMin && player.level <= match.levelMax)
          : null,
        requestStatus,
        isCircleMember,
        inviteId,
        inviteStatus,
      },
    };
  },
});
