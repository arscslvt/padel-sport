import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { membershipOf } from "../circles/lib";
import {
  bestInvitePerPlayer,
  getIdentityPlayer,
  inviteKindOf,
  type MatchInviteKind,
  playerInviteFor,
  type PlayerView,
  toMatchView,
  toPlayerView,
  visibilityOf,
} from "./lib";

export interface MatchInviteeView {
  inviteId: Id<"matchInvites">;
  player: PlayerView;
  status: "pending" | "accepted" | "declined" | "cancelled";
  /** `direct` tiene il posto, `circle` è una diffusione alla cerchia. */
  kind: MatchInviteKind;
}

/**
 * Dettaglio di una partita aperta, con lo stato del viewer
 * (membro, creatore, richiesta in corso) per pilotare la CTA dell'app.
 *
 * Arrivano anche gli invitati e la loro risposta: è quello che dice al
 * creatore se ha senso aspettare ancora o aprire la partita a tutti.
 *
 * Una partita privata la vede solo chi ne fa parte o chi è stato invitato: a
 * tutti gli altri risponde `null`, altrimenti basterebbe conoscere l'id per
 * leggere una partita che non li riguarda.
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

    const visibility = visibilityOf(match);

    let inviteId: Id<"matchInvites"> | null = null;
    let inviteStatus: MatchInviteeView["status"] | null = null;
    let isCircleMember = false;

    if (player) {
      if (match.circleId) {
        isCircleMember =
          (await membershipOf(ctx, match.circleId, player._id)) !== null;
      }

      const invite = await playerInviteFor(ctx, matchId, player._id);

      if (invite) {
        inviteId = invite._id;
        inviteStatus = invite.status;
      }
    }

    const isMember = player ? match.playerIds.includes(player._id) : false;

    // La privata è affare di chi ci gioca e di chi è stato chiamato
    if (visibility === "private" && !isMember && !inviteId) {
      return null;
    }

    const invites = await ctx.db
      .query("matchInvites")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .collect();

    const invitees: MatchInviteeView[] = [];

    for (const invite of bestInvitePerPlayer(invites)) {
      const invitee = await ctx.db.get(invite.playerId);
      if (!invitee) continue;

      invitees.push({
        inviteId: invite._id,
        player: toPlayerView(invitee),
        status: invite.status,
        kind: inviteKindOf(invite),
      });
    }

    invitees.sort((a, b) => a.player.name.localeCompare(b.player.name));

    return {
      ...view,
      invitees,
      viewer: {
        playerId: player?._id ?? null,
        isMember,
        isCreator: player ? match.creatorId === player._id : false,
        levelOk: player
          ? // Il livello filtra solo dove ci si unisce da sconosciuti
            visibility !== "public" ||
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
