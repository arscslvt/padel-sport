import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requirePlayer } from "../openMatches/lib";
import { friendshipBetween } from "./lib";

/**
 * Chiede l'amicizia a un altro giocatore.
 *
 * Se quel giocatore ci aveva già scritto, la richiesta in arrivo viene
 * accettata invece di crearne una seconda in senso opposto: due persone che
 * si cercano a vicenda diventano amiche senza altri passaggi.
 */
export default mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await requirePlayer(ctx);

    if (playerId === player._id) {
      throw new Error("Non puoi aggiungere te stesso.");
    }

    const target = await ctx.db.get(playerId);
    if (!target) {
      throw new Error("Giocatore non trovato.");
    }

    const existing = await friendshipBetween(ctx, player._id, playerId);

    if (existing?.status === "accepted") {
      throw new Error("Siete già amici.");
    }

    if (existing?.status === "pending") {
      if (existing.requesterId === player._id) {
        throw new Error("Hai già inviato una richiesta a questo giocatore.");
      }

      await ctx.db.patch(existing._id, {
        status: "accepted",
        respondedAt: Date.now(),
      });

      return { status: "accepted" as const, friendshipId: existing._id };
    }

    const friendshipId = await ctx.db.insert("friendships", {
      requesterId: player._id,
      addresseeId: playerId,
      status: "pending",
      createdAt: Date.now(),
    });

    return { status: "pending" as const, friendshipId };
  },
});
