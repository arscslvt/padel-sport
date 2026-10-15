import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";

/**
 * Le letture e le scritture del WhatsApp d'invito (matchInvite.ts), che gira
 * su Node e il database non lo tocca direttamente.
 */

export const payload = internalQuery({
  args: { inviteId: v.id("matchInvites") },
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.db.get(inviteId);
    if (!invite || invite.status !== "pending") return null;

    const [match, invitee] = await Promise.all([
      ctx.db.get(invite.matchId),
      ctx.db.get(invite.playerId),
    ]);
    if (!match || match.status === "cancelled" || !invitee?.phone) return null;
    if (match.matchDate <= Date.now()) return null;

    const inviter = await ctx.db.get(match.creatorId);

    return {
      phone: invitee.phone,
      firstName: invitee.firstName ?? invitee.name.split(" ")[0],
      inviterName: inviter?.name ?? "Un amico",
      matchDate: match.matchDate,
    };
  },
});

export const markSent = internalMutation({
  args: { inviteId: v.id("matchInvites") },
  handler: async (ctx, { inviteId }) => {
    await ctx.db.patch(inviteId, { whatsappSentAt: Date.now() });
  },
});
