import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requirePlayer } from "../openMatches/lib";
import { ensureFriendRequest } from "./lib";

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

    const outcome = await ensureFriendRequest(ctx, player._id, playerId);

    // Qui, a differenza dell'invito a una cerchia, chiedere di nuovo è un
    // errore dell'utente: la schermata mostrava già lo stato del legame.
    if (!outcome.changed) {
      throw new Error(
        outcome.status === "friend"
          ? "Siete già amici."
          : "Hai già inviato una richiesta a questo giocatore.",
      );
    }

    return {
      status: outcome.status === "friend" ? ("accepted" as const) : ("pending" as const),
      friendshipId: outcome.friendshipId,
    };
  },
});
