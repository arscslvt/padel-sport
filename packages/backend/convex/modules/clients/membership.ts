import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import { paymentMethod } from "../../tables/memberships";
import { assertServer } from "../../utils/serverSecret";
import { lastMembership, membershipEnd } from "./lib";

/**
 * La tessera annuale: aprirla, rinnovarla, segnare il pagamento.
 *
 * Il rinnovo non modifica la tessera vecchia, ne apre una nuova: così l'anno
 * passato resta agli atti con il suo pagamento, che è quello che serve quando
 * qualcuno chiede «ma io quando ho pagato?».
 */

export const save = mutation({
  args: {
    secret: v.string(),
    playerId: v.id("players"),
    /** Assente per una tessera nuova, presente per correggerne una. */
    membershipId: v.optional(v.id("memberships")),
    startsAt: v.optional(v.float64()),
    paid: v.boolean(),
    paidAt: v.optional(v.float64()),
    method: v.optional(paymentMethod),
    amount: v.optional(v.float64()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Cliente non trovato.");

    if (args.paid && !args.method) {
      throw new Error("Indica come è stata pagata l'iscrizione.");
    }

    // Segnata come pagata senza data: vale oggi, che è il caso normale allo
    // sportello. Non pagata: la data, se c'era, non ha più senso.
    const paidAt = args.paid ? (args.paidAt ?? Date.now()) : undefined;

    if (args.membershipId) {
      const membership = await ctx.db.get(args.membershipId);
      if (!membership || membership.playerId !== args.playerId) {
        throw new Error("Tessera non trovata.");
      }

      const startsAt = args.startsAt ?? membership.startsAt;

      await ctx.db.patch(args.membershipId, {
        startsAt,
        endsAt: membershipEnd(startsAt),
        paid: args.paid,
        paidAt,
        method: args.paid ? args.method : undefined,
        amount: args.amount,
        note: args.note?.trim() || undefined,
      });

      return { membershipId: args.membershipId, renewed: false };
    }

    // Il rinnovo parte da dove finisce la tessera precedente, non da oggi: chi
    // rinnova un mese prima non deve perdere quel mese.
    const previous = await lastMembership(ctx, args.playerId);
    const now = Date.now();

    const startsAt =
      args.startsAt ??
      (previous && previous.endsAt > now ? previous.endsAt : now);

    const membershipId = await ctx.db.insert("memberships", {
      playerId: args.playerId,
      startsAt,
      endsAt: membershipEnd(startsAt),
      paid: args.paid,
      paidAt,
      method: args.paid ? args.method : undefined,
      amount: args.amount,
      note: args.note?.trim() || undefined,
      createdAt: now,
    });

    return { membershipId, renewed: Boolean(previous) };
  },
});

export const remove = mutation({
  args: {
    secret: v.string(),
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, { secret, membershipId }) => {
    assertServer(secret);
    await ctx.db.delete(membershipId);
  },
});
