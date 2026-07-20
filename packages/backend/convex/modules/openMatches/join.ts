import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { addPlayerToMatch, requirePlayer } from "./lib";

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
