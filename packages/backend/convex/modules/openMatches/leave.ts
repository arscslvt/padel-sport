import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import {
  playerInviteFor,
  requirePlayer,
  syncBookingPlayers,
  syncMatchStatus,
} from "./lib";

/**
 * Esce da una partita a cui ci si era uniti.
 *
 * Se a uscire è il creatore la partita non viene annullata: resta agli altri
 * giocatori e il ruolo di organizzatore passa a uno di loro, estratto a sorte.
 * Con lui si sposta anche la prenotazione del campo, altrimenti la struttura
 * continuerebbe a vedere il campo intestato a chi non gioca più.
 *
 * Restare l'unico giocatore non è previsto: in quel caso la partita va
 * eliminata (modules/openMatches/cancel.ts), così il campo torna libero.
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
      throw new Error("La partita è stata annullata.");
    }

    if (match.matchDate <= Date.now()) {
      throw new Error("La partita è già iniziata o conclusa.");
    }

    if (!match.playerIds.includes(player._id)) {
      throw new Error("Non fai parte di questa partita.");
    }

    const playerIds = match.playerIds.filter((id) => id !== player._id);

    if (playerIds.length === 0) {
      throw new Error(
        "Sei l'unico giocatore: elimina la partita per liberare il campo.",
      );
    }

    const isCreator = match.creatorId === player._id;
    const heir = isCreator
      ? playerIds[Math.floor(Math.random() * playerIds.length)]
      : match.creatorId;

    await ctx.db.patch(match._id, { playerIds, creatorId: heir });

    if (isCreator) {
      const newCreator = await ctx.db.get(heir);
      const booking = await ctx.db.get(match.bookingId);
      if (booking) {
        await ctx.db.patch(match.bookingId, {
          bookedBy: newCreator?.name ?? booking.bookedBy,
          createdByPlayer: heir,
        });
      }
    }

    // I nomi sulla prenotazione e lo stato della partita li ricalcolano gli
    // helper: sono la stessa somma che vale per ingressi, ospiti e inviti.
    const updated = await ctx.db.get(match._id);
    if (updated) {
      await syncBookingPlayers(ctx, updated);
    }
    await syncMatchStatus(ctx, match._id);

    // La richiesta accettata non vale più: se cambia idea ne servirà una nuova
    const requests = await ctx.db
      .query("joinRequests")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", matchId).eq("playerId", player._id),
      )
      .collect();

    for (const request of requests) {
      if (request.status === "pending" || request.status === "accepted") {
        await ctx.db.patch(request._id, { status: "cancelled" });
      }
    }

    // Stessa cosa per l'invito di cerchia che lo aveva fatto entrare: da qui
    // in poi la partita è di nuovo qualcosa a cui deve scegliere di unirsi.
    const invite = await playerInviteFor(ctx, matchId, player._id);

    if (invite && invite.status === "accepted") {
      await ctx.db.patch(invite._id, {
        status: "cancelled",
        respondedAt: Date.now(),
      });
    }

    return { newCreatorId: isCreator ? heir : null };
  },
});
