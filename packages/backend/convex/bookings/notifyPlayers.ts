import { v } from "convex/values";

import { mutation } from "../_generated/server";
import {
  confirmToNewPlayers,
  notifiedPlayers,
} from "../modules/notifications/bookingPlayers";
import { assertServer } from "../utils/serverSecret";

/**
 * La conferma ai giocatori collegati che non l'hanno mai avuta: mail con il
 * QR e WhatsApp, come agli altri.
 *
 * Serve alle prenotazioni confermate prima che la conferma andasse a tutta la
 * squadra (16/10/2026): lì i compagni collegati non hanno ricevuto niente, e
 * il codice di oggi li avvisa solo quando succede qualcosa. Lo staff lo
 * decide prenotazione per prenotazione, dalla scheda: nessun invio in massa
 * parte da solo.
 *
 * Passa dalla route della dashboard (api/dashboard/bookings/notify-players).
 */
export const sendMissing = mutation({
  args: { secret: v.string(), bookingId: v.id("bookings") },
  handler: async (ctx, { secret, bookingId }) => {
    assertServer(secret);

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");
    if (booking.status !== "accepted_on_site_payment") {
      throw new Error(
        "La conferma si manda solo per le prenotazioni confermate.",
      );
    }
    if (booking.bookingDate <= Date.now()) {
      throw new Error("La partita è già iniziata.");
    }

    const deliveries = await ctx.db
      .query("bookingDeliveries")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .collect();
    const confirmed = new Set(
      deliveries
        .filter((row) => row.kind === "accepted" && row.playerId)
        .map((row) => row.playerId),
    );

    const missing = (await notifiedPlayers(ctx, booking)).filter(
      (player) => !confirmed.has(player._id),
    );
    if (missing.length === 0) {
      throw new Error("Tutti i giocatori collegati hanno già la conferma.");
    }

    await confirmToNewPlayers(
      ctx,
      bookingId,
      missing.map((player) => player._id),
    );

    return { names: missing.map((player) => player.name) };
  },
});
