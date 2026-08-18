import { query } from "../../_generated/server";
import { getIdentityPlayer, toPlayerView } from "../openMatches/lib";
import {
  type CircleInviteView,
  type CircleView,
  MAX_CIRCLES,
  memberViews,
  membersOf,
  membershipsOf,
  upcomingCircleMatches,
} from "./lib";

export interface CirclesView {
  circles: CircleView[];
  /** Inviti ricevuti e ancora senza risposta. */
  invites: CircleInviteView[];
  /** Quante cerchie in più può ancora avere il giocatore. */
  remaining: number;
  max: number;
}

/**
 * Cerchie del giocatore e inviti in sospeso, per la sezione "Cerchie".
 * Restituisce `null` se non c'è ancora un profilo giocatore.
 */
export default query({
  args: {},
  handler: async (ctx): Promise<CirclesView | null> => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return null;

    const memberships = await membershipsOf(ctx, player._id);

    const circles: CircleView[] = [];

    for (const membership of memberships) {
      const circle = await ctx.db.get(membership.circleId);
      if (!circle) continue;

      const owner = await ctx.db.get(circle.ownerId);
      if (!owner) continue;

      const circleMemberships = await membersOf(ctx, circle._id);
      const members = await memberViews(ctx, circleMemberships);

      // Gli inviti in sospeso li vede solo chi li ha mandati
      const pendingInvites =
        membership.role === "owner"
          ? (
              await ctx.db
                .query("circleInvites")
                .withIndex("by_circle_status", (q) =>
                  q.eq("circleId", circle._id).eq("status", "pending"),
                )
                .collect()
            ).length
          : 0;

      const upcoming = await upcomingCircleMatches(ctx, circle._id);

      circles.push({
        id: circle._id,
        name: circle.name,
        role: membership.role,
        owner: toPlayerView(owner),
        members,
        pendingInvites,
        nextMatchDate: upcoming[0]?.matchDate ?? null,
      });
    }

    circles.sort((a, b) => a.name.localeCompare(b.name));

    const pendingForMe = await ctx.db
      .query("circleInvites")
      .withIndex("by_invitee_status", (q) =>
        q.eq("inviteeId", player._id).eq("status", "pending"),
      )
      .collect();

    const invites: CircleInviteView[] = [];

    for (const invite of pendingForMe) {
      const [circle, inviter] = await Promise.all([
        ctx.db.get(invite.circleId),
        ctx.db.get(invite.inviterId),
      ]);

      // Cerchia sciolta o profilo sparito: l'invito non ha più un significato
      if (!circle || !inviter) continue;

      const circleMemberships = await membersOf(ctx, circle._id);

      invites.push({
        inviteId: invite._id,
        circleId: circle._id,
        circleName: circle.name,
        inviter: toPlayerView(inviter),
        note: invite.note,
        createdAt: invite.createdAt,
        memberCount: circleMemberships.length,
      });
    }

    invites.sort((a, b) => b.createdAt - a.createdAt);

    return {
      circles,
      invites,
      remaining: Math.max(0, MAX_CIRCLES - memberships.length),
      max: MAX_CIRCLES,
    };
  },
});
