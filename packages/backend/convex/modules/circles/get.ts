import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import {
  getIdentityPlayer,
  type OpenMatchView,
  type PlayerView,
  toMatchView,
  toPlayerView,
} from "../openMatches/lib";
import {
  type CircleRole,
  memberViews,
  membersOf,
  membershipOf,
  upcomingCircleMatches,
} from "./lib";

export interface CirclePendingInvite {
  inviteId: Id<"circleInvites">;
  player: PlayerView;
  note?: string;
  createdAt: number;
}

export interface CircleDetailView {
  id: Id<"circles">;
  name: string;
  owner: PlayerView;
  members: PlayerView[];
  /** Solo per il proprietario: chi non ha ancora risposto. */
  pendingInvites: CirclePendingInvite[];
  matches: OpenMatchView[];
  viewer: {
    playerId: Id<"players">;
    role: CircleRole;
  };
}

/**
 * Dettaglio di una cerchia: membri, inviti in sospeso e partite in programma.
 * Restituisce `null` a chi non ne fa parte, così la pagina non espone nulla.
 */
export default query({
  args: { circleId: v.id("circles") },
  handler: async (ctx, { circleId }): Promise<CircleDetailView | null> => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return null;

    const circle = await ctx.db.get(circleId);
    if (!circle) return null;

    const membership = await membershipOf(ctx, circleId, player._id);
    if (!membership) return null;

    const owner = await ctx.db.get(circle.ownerId);
    if (!owner) return null;

    const memberships = await membersOf(ctx, circleId);
    const members = await memberViews(ctx, memberships);

    const pendingInvites: CirclePendingInvite[] = [];

    if (membership.role === "owner") {
      const invites = await ctx.db
        .query("circleInvites")
        .withIndex("by_circle_status", (q) =>
          q.eq("circleId", circleId).eq("status", "pending"),
        )
        .collect();

      for (const invite of invites) {
        const invitee = await ctx.db.get(invite.inviteeId);
        if (!invitee) continue;

        pendingInvites.push({
          inviteId: invite._id,
          player: toPlayerView(invitee),
          note: invite.note,
          createdAt: invite.createdAt,
        });
      }

      pendingInvites.sort((a, b) => b.createdAt - a.createdAt);
    }

    const upcoming = await upcomingCircleMatches(ctx, circleId);
    const matches = await Promise.all(
      upcoming.map((match) => toMatchView(ctx, match)),
    );

    return {
      id: circle._id,
      name: circle.name,
      owner: toPlayerView(owner),
      members,
      pendingInvites,
      matches,
      viewer: { playerId: player._id, role: membership.role },
    };
  },
});
