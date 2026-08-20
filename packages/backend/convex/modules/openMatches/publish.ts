import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { LEVEL_MAX, LEVEL_MIN, requirePlayer, visibilityOf } from "./lib";
import { formatClubDateTime } from "../../utils/clubTime";
import { staffBookingUrl } from "../../utils/staffLinks";

/**
 * Apre a tutti una partita privata o di cerchia.
 *
 * È la via d'uscita quando la cerchia o gli invitati non bastano a fare
 * quattro: chi è già entrato resta al suo posto, ospiti e inviti compresi, e i
 * posti ancora liberi diventano visibili nell'elenco delle partite aperte. Qui
 * il creatore sceglie finalmente il livello e la modalità d'accesso, che prima
 * non filtravano nessuno.
 *
 * `circleId` non viene cancellato: la partita continua a raccontare da dove
 * arriva, e gli inviti ancora in sospeso restano validi.
 */
export default mutation({
  args: {
    matchId: v.id("openMatches"),
    levelMin: v.number(),
    levelMax: v.number(),
    joinMode: v.union(v.literal("direct"), v.literal("request")),
  },
  handler: async (ctx, { matchId, levelMin, levelMax, joinMode }) => {
    const player = await requirePlayer(ctx);

    const match = await ctx.db.get(matchId);
    if (!match) {
      throw new Error("Partita non trovata.");
    }

    if (match.creatorId !== player._id) {
      throw new Error("Solo chi ha creato la partita può renderla aperta.");
    }

    if (visibilityOf(match) === "public") {
      throw new Error("Questa partita è già aperta a tutti.");
    }

    if (match.status !== "open") {
      throw new Error(
        match.status === "full"
          ? "La partita è già al completo."
          : "La partita è stata cancellata.",
      );
    }

    if (match.matchDate <= Date.now()) {
      throw new Error("La partita è già iniziata o conclusa.");
    }

    if (levelMin < LEVEL_MIN || levelMax > LEVEL_MAX || levelMin > levelMax) {
      throw new Error("Il livello richiesto non è valido.");
    }

    // Il nuovo range non può escludere chi è già dentro: sono già in squadra
    const playerDocs = await Promise.all(
      match.playerIds.map((id) => ctx.db.get(id)),
    );

    const outOfRange = playerDocs
      .filter((doc) => doc !== null)
      .filter((doc) => doc.level < levelMin || doc.level > levelMax);

    if (outOfRange.length > 0) {
      const names = outOfRange.map((doc) => doc.name).join(", ");
      throw new Error(
        `Il livello scelto lascerebbe fuori chi è già in partita (${names}). Allarga il range.`,
      );
    }

    await ctx.db.patch(matchId, {
      visibility: "public",
      levelMin,
      levelMax,
      joinMode,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      {
        title: "Partita aperta a tutti",
        message: `${player.name} ha reso aperta la partita del ${formatClubDateTime(
          match.matchDate,
        )}: mancano ${match.maxPlayers - match.playerIds.length} giocatori.`,
        url: staffBookingUrl(match.bookingId),
        idempotencyKey: `match-open-${matchId}`,
      },
    );

    return { matchId };
  },
});
