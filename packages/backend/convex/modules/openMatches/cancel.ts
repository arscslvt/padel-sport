import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import {
  CANCEL_DEADLINE_MS,
  cancelPendingMatchInvites,
  requirePlayer,
} from "./lib";

/**
 * Elimina una partita creata dall'utente, annullando anche la prenotazione
 * del campo così che lo slot torni disponibile.
 *
 * Si può eliminare solo finché si è ancora l'unico giocatore: quando altri si
 * sono uniti la partita non è più solo del creatore, che può al massimo
 * uscirne (modules/openMatches/leave.ts).
 */
export default mutation({
  args: { matchId: v.id("openMatches") },
  handler: async (ctx, { matchId }) => {
    const player = await requirePlayer(ctx);

    const match = await ctx.db.get(matchId);
    if (!match) {
      throw new Error("Partita non trovata.");
    }

    if (match.status === "cancelled") {
      throw new Error("La partita è già stata annullata.");
    }

    if (match.creatorId !== player._id) {
      throw new Error("Solo chi ha creato la partita può eliminarla.");
    }

    if (match.playerIds.length > 1) {
      throw new Error(
        "Altri giocatori si sono già uniti: puoi solo uscire dalla partita.",
      );
    }

    if (match.matchDate - Date.now() < CANCEL_DEADLINE_MS) {
      throw new Error(
        "Puoi eliminare la partita fino a 2 ore prima dell'inizio. Contatta la struttura.",
      );
    }

    await ctx.db.patch(match._id, { status: "cancelled" });
    await ctx.db.patch(match.bookingId, { status: "cancelled" });

    // Le richieste ancora in attesa non hanno più una partita a cui riferirsi
    const pendingRequests = await ctx.db
      .query("joinRequests")
      .withIndex("by_match_status", (q) =>
        q.eq("matchId", matchId).eq("status", "pending"),
      )
      .collect();

    for (const request of pendingRequests) {
      await ctx.db.patch(request._id, { status: "cancelled" });
    }

    // Nemmeno gli inviti di cerchia: non c'è più niente da accettare
    await cancelPendingMatchInvites(ctx, matchId);

    await ctx.scheduler.runAfter(
      0,
      internal.modules.courtCalendar.push.remove,
      { bookingId: match.bookingId },
    );

    // Chi annulla lo sa già, ma i compagni che erano in squadra no.
    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.bookingMail.default,
      { bookingId: match.bookingId, kind: "cancelled_by_player" },
    );

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      {
        title: "Partita eliminata dall'app",
        message: `${player.name} ha eliminato la partita del ${new Date(
          match.matchDate,
        ).toLocaleString("it-IT")}: il campo torna disponibile.`,
        tags: ["booking", "cancelled", "mobile"],
      },
    );

    return { bookingId: match.bookingId };
  },
});
