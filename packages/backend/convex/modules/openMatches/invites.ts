import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { mutation, query } from "../../_generated/server";
import {
  addPlayerToMatch,
  getIdentityPlayer,
  type OpenMatchView,
  requirePlayer,
  toMatchView,
} from "./lib";

export interface MatchInviteView {
  inviteId: Id<"matchInvites">;
  match: OpenMatchView;
  circleName: string;
  createdAt: number;
}

/**
 * Risponde all'invito a una partita di cerchia.
 *
 * Accettare equivale a unirsi: l'invito è già un'approvazione, quindi non
 * passa dalle richieste di partecipazione. È `addPlayerToMatch` a segnare poi
 * l'invito come accettato, così il percorso è lo stesso anche per chi entra
 * dalla partita invece che dall'invito.
 */
export const respond = mutation({
  args: {
    inviteId: v.id("matchInvites"),
    accept: v.boolean(),
  },
  handler: async (ctx, { inviteId, accept }) => {
    const player = await requirePlayer(ctx);

    const invite = await ctx.db.get(inviteId);
    if (!invite) {
      throw new Error("Invito non trovato.");
    }

    if (invite.playerId !== player._id) {
      throw new Error("Puoi rispondere solo agli inviti che ricevi.");
    }

    if (invite.status !== "pending") {
      throw new Error("Hai già risposto a questo invito.");
    }

    if (!accept) {
      await ctx.db.patch(inviteId, {
        status: "declined",
        respondedAt: Date.now(),
      });
      return { status: "declined" as const };
    }

    const match = await ctx.db.get(invite.matchId);
    if (!match) {
      await ctx.db.patch(inviteId, {
        status: "cancelled",
        respondedAt: Date.now(),
      });
      throw new Error("Questa partita non esiste più.");
    }

    await addPlayerToMatch(ctx, match, player);

    return { status: "accepted" as const, matchId: match._id };
  },
});

/**
 * Inviti a partite di cerchia ancora senza risposta, dal più imminente.
 * Gli inviti a partite ormai passate o cancellate non vengono mostrati.
 */
export const listMine = query({
  args: {},
  handler: async (ctx): Promise<MatchInviteView[]> => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return [];

    const invites = await ctx.db
      .query("matchInvites")
      .withIndex("by_player_status", (q) =>
        q.eq("playerId", player._id).eq("status", "pending"),
      )
      .collect();

    const views: MatchInviteView[] = [];

    for (const invite of invites) {
      const match = await ctx.db.get(invite.matchId);
      if (!match) continue;
      if (match.status === "cancelled") continue;
      if (match.matchDate <= Date.now()) continue;

      const circle = await ctx.db.get(invite.circleId);
      if (!circle) continue;

      views.push({
        inviteId: invite._id,
        match: await toMatchView(ctx, match),
        circleName: circle.name,
        createdAt: invite.createdAt,
      });
    }

    views.sort((a, b) => a.match.matchDate - b.match.matchDate);

    return views;
  },
});
