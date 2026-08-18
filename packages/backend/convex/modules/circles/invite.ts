import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { mutation } from "../../_generated/server";
import { ensureFriendRequest } from "../friends/lib";
import { requirePlayer } from "../openMatches/lib";
import { MAX_CIRCLE_MEMBERS, membersOf, requireCircleOwner } from "./lib";

export interface InviteOutcome {
  /** Inviti effettivamente creati. */
  invited: number;
  /** Nomi di chi era già dentro o aveva già un invito in sospeso. */
  skipped: string[];
  /** Nomi di chi ha ricevuto anche la richiesta di amicizia. */
  friendRequests: string[];
}

/**
 * Invita una lista di giocatori nella cerchia.
 *
 * Chi non è ancora amico riceve, insieme all'invito, la richiesta di amicizia:
 * si entra in una cerchia solo fra amici, ma non si deve fare il giro lungo di
 * chiedere l'amicizia, aspettare, e solo dopo invitare.
 *
 * Chi è già dentro o ha già un invito in sospeso viene saltato in silenzio
 * invece di far fallire tutto il resto della lista.
 */
export async function inviteToCircle(
  ctx: MutationCtx,
  circle: Doc<"circles">,
  inviter: Doc<"players">,
  playerIds: Id<"players">[],
  note?: string,
): Promise<InviteOutcome> {
  const members = await membersOf(ctx, circle._id);
  const memberIds = new Set(members.map((member) => member.playerId));

  const pending = (
    await ctx.db
      .query("circleInvites")
      .withIndex("by_circle_status", (q) =>
        q.eq("circleId", circle._id).eq("status", "pending"),
      )
      .collect()
  ).map((invite) => invite.inviteeId);
  const pendingIds = new Set(pending);

  const outcome: InviteOutcome = { invited: 0, skipped: [], friendRequests: [] };

  // I duplicati nella lista in arrivo non devono generare due inviti
  for (const playerId of new Set(playerIds)) {
    if (playerId === inviter._id) continue;

    const target = await ctx.db.get(playerId);
    if (!target) continue;

    if (memberIds.has(playerId) || pendingIds.has(playerId)) {
      outcome.skipped.push(target.name);
      continue;
    }

    if (members.length + pendingIds.size + outcome.invited >= MAX_CIRCLE_MEMBERS) {
      throw new Error(
        `Una cerchia può arrivare a ${MAX_CIRCLE_MEMBERS} giocatori: hai già raggiunto il limite.`,
      );
    }

    const friendship = await ensureFriendRequest(ctx, inviter._id, playerId);
    if (friendship.status === "outgoing") {
      outcome.friendRequests.push(target.name);
    }

    await ctx.db.insert("circleInvites", {
      circleId: circle._id,
      inviterId: inviter._id,
      inviteeId: playerId,
      note,
      status: "pending",
      createdAt: Date.now(),
    });

    outcome.invited += 1;
  }

  return outcome;
}

/** Invita altri giocatori in una cerchia già esistente. Solo il proprietario. */
export default mutation({
  args: {
    circleId: v.id("circles"),
    playerIds: v.array(v.id("players")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { circleId, playerIds, note }) => {
    const player = await requirePlayer(ctx);
    const circle = await requireCircleOwner(ctx, circleId, player._id);

    if (playerIds.length === 0) {
      throw new Error("Scegli almeno un giocatore da invitare.");
    }

    return await inviteToCircle(
      ctx,
      circle,
      player,
      playerIds,
      note?.trim() || undefined,
    );
  },
});
