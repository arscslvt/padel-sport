import { query } from "../../_generated/server";
import { getIdentityPlayer, MATCH_DURATION_MS } from "./lib";

export interface MyBookingView {
  bookingId: string;
  matchId: string | null;
  bookingDate: number;
  court?: string;
  code?: string;
  playerNames: string[];
  open: boolean;
  isCreator: boolean;
  cancelled: boolean;
}

/**
 * Prenotazioni e partite dell'utente: quelle create da lui (aperte o chiuse)
 * e quelle a cui si è unito, a partire da quelle in corso.
 */
export default query({
  args: {},
  handler: async (ctx): Promise<MyBookingView[] | null> => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return null;

    const horizon = Date.now() - MATCH_DURATION_MS;

    const ownBookings = await ctx.db
      .query("bookings")
      .withIndex("by_created_by_player", (q) =>
        q.eq("createdByPlayer", player._id).gte("bookingDate", horizon),
      )
      .collect();

    const upcomingMatches = await ctx.db
      .query("openMatches")
      .withIndex("by_date", (q) => q.gte("matchDate", horizon))
      .collect();

    const joinedMatches = upcomingMatches.filter(
      (match) =>
        match.status !== "cancelled" && match.playerIds.includes(player._id),
    );

    const views = new Map<string, MyBookingView>();

    for (const match of joinedMatches) {
      const booking = await ctx.db.get(match.bookingId);
      if (!booking) continue;
      const slot = await ctx.db.get(booking.slot);

      views.set(booking._id, {
        bookingId: booking._id,
        matchId: match._id,
        bookingDate: booking.bookingDate,
        court: slot?.name,
        code: booking.code,
        playerNames: booking.players,
        open: true,
        isCreator: match.creatorId === player._id,
        cancelled: booking.status === "cancelled",
      });
    }

    for (const booking of ownBookings) {
      if (views.has(booking._id)) continue;
      const slot = await ctx.db.get(booking.slot);

      views.set(booking._id, {
        bookingId: booking._id,
        matchId: null,
        bookingDate: booking.bookingDate,
        court: slot?.name,
        code: booking.code,
        playerNames: booking.players,
        open: false,
        isCreator: true,
        cancelled: booking.status === "cancelled",
      });
    }

    return [...views.values()].sort((a, b) => a.bookingDate - b.bookingDate);
  },
});
