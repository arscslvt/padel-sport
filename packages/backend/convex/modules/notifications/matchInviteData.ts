import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../functions";
import { clubOf } from "../clubs/lib";
import { firstNameOf, whatsappPhone } from "./bookingPlayers";

/**
 * Le letture e le scritture dell'invito a una partita (matchInvite.ts), che
 * gira su Node e il database non lo tocca direttamente.
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
    if (!match || match.status === "cancelled" || !invitee) return null;
    if (match.matchDate <= Date.now()) return null;

    const [inviter, booking] = await Promise.all([
      ctx.db.get(match.creatorId),
      ctx.db.get(match.bookingId),
    ]);
    if (!booking) return null;

    const slot = await ctx.db.get(booking.slot);

    return {
      /** Il numero WhatsApp da cui parte l'invito è del club della partita. */
      clubId: clubOf(match),
      bookingId: booking._id,
      playerId: invitee._id,
      name: invitee.name,
      firstName: firstNameOf(invitee),
      /** Pronto per Twilio; assente se in anagrafica non c'è. */
      phone: whatsappPhone(invitee.phone),
      email: invitee.email,
      clerkUserId: invitee.clerkUserId,
      inviterName: inviter?.name ?? "Un amico",
      matchDate: match.matchDate,
      court: slot?.name,
      players: booking.players,
    };
  },
});

export const markSent = internalMutation({
  args: { inviteId: v.id("matchInvites") },
  handler: async (ctx, { inviteId }) => {
    await ctx.db.patch(inviteId, { whatsappSentAt: Date.now() });
  },
});
