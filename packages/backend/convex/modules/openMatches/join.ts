import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { membershipOf } from "../circles/lib";
import { addPlayerToMatch, requirePlayer, visibilityOf } from "./lib";

/** Unisciti subito a una partita aperta in modalità "direct". */
export default mutation({
  args: { matchId: v.id("openMatches") },
  handler: async (ctx, { matchId }) => {
    const player = await requirePlayer(ctx);

    const match = await ctx.db.get(matchId);
    if (!match) {
      throw new Error("Partita non trovata.");
    }

    if (match.joinMode !== "direct") {
      throw new Error(
        "Questa partita richiede l'approvazione del creatore: invia una richiesta.",
      );
    }

    // Le partite di cerchia hanno joinMode "direct", ma quel "direct" vale
    // solo per chi è nella cerchia: da fuori non ci si entra.
    if (visibilityOf(match) === "circle" && match.circleId) {
      const membership = await membershipOf(ctx, match.circleId, player._id);
      if (!membership) {
        throw new Error("Questa partita è riservata ai membri della cerchia.");
      }
    }

    await addPlayerToMatch(ctx, match, player);

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      {
        title: "Nuovo giocatore in partita",
        message: `${player.name} si è unito alla partita del ${new Date(
          match.matchDate,
        ).toLocaleString("it-IT")}.`,
        tags: ["match", "join"],
      },
    );

    return matchId;
  },
});
