import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { acceptPendingFriendship } from "../friends/lib";
import { requirePlayer } from "../openMatches/lib";
import { assertCircleQuota, MAX_CIRCLE_MEMBERS, membersOf } from "./lib";

/**
 * Accetta o rifiuta un invito a una cerchia.
 *
 * Accettare vale anche come risposta alla richiesta di amicizia partita
 * insieme all'invito: entrare nella cerchia di qualcuno senza esserne amico
 * lascerebbe un rapporto a metà.
 *
 * Il rifiuto conserva la riga come `declined` (a differenza delle amicizie,
 * dove il no cancella tutto): serve al proprietario per sapere chi ha già
 * detto di no e non insistere.
 */
export default mutation({
  args: {
    inviteId: v.id("circleInvites"),
    accept: v.boolean(),
  },
  handler: async (ctx, { inviteId, accept }) => {
    const player = await requirePlayer(ctx);

    const invite = await ctx.db.get(inviteId);
    if (!invite) {
      throw new Error("Invito non trovato.");
    }

    if (invite.inviteeId !== player._id) {
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

    const circle = await ctx.db.get(invite.circleId);
    if (!circle) {
      // La cerchia è stata sciolta mentre l'invito era in sospeso
      await ctx.db.patch(inviteId, {
        status: "cancelled",
        respondedAt: Date.now(),
      });
      throw new Error("Questa cerchia non esiste più.");
    }

    const members = await membersOf(ctx, circle._id);

    // Già dentro (doppio invito, o accettato altrove): resta solo da chiudere
    // l'invito. La quota non va controllata, questa cerchia la conta già.
    if (members.some((member) => member.playerId === player._id)) {
      await ctx.db.patch(inviteId, {
        status: "accepted",
        respondedAt: Date.now(),
      });
      return { status: "accepted" as const, circleId: circle._id };
    }

    await assertCircleQuota(ctx, player._id);

    if (members.length >= MAX_CIRCLE_MEMBERS) {
      throw new Error("Questa cerchia è al completo.");
    }

    await ctx.db.insert("circleMembers", {
      circleId: circle._id,
      playerId: player._id,
      role: "member",
      joinedAt: Date.now(),
    });

    await ctx.db.patch(inviteId, {
      status: "accepted",
      respondedAt: Date.now(),
    });

    await acceptPendingFriendship(ctx, invite.inviterId, player._id);

    return { status: "accepted" as const, circleId: circle._id };
  },
});
