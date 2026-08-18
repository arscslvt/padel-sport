import { v } from "convex/values";
import { query } from "../../_generated/server";
import { guestsOf, MAX_PLAYERS, occupancyOf, requirePlayer } from "./lib";

/**
 * Tutto ciò che serve a spedire la conferma di una prenotazione: destinatari
 * compresi.
 *
 * Esiste separata da `get` perché è l'unico punto in cui escono le email degli
 * ospiti, e devono uscire solo verso chi ha organizzato la partita: la route
 * che manda le mail non si fida degli indirizzi che le passa il browser, se li
 * fa dare da qui.
 */
export default query({
  args: { matchId: v.id("openMatches") },
  handler: async (ctx, { matchId }) => {
    const player = await requirePlayer(ctx);

    const match = await ctx.db.get(matchId);
    if (!match) return null;

    // Solo chi ha prenotato può sapere chi riceverà la mail.
    if (match.creatorId !== player._id) return null;

    const booking = await ctx.db.get(match.bookingId);
    if (!booking) return null;

    const slot = await ctx.db.get(booking.slot);
    const guests = await guestsOf(ctx, matchId);
    const occupancy = await occupancyOf(ctx, match);

    const playerDocs = await Promise.all(
      match.playerIds.map((id) => ctx.db.get(id)),
    );

    return {
      code: booking.code,
      matchDate: match.matchDate,
      court: slot?.name,
      level: booking.level,
      bookedBy: booking.bookedBy,
      phone: booking.phone,
      notes: match.notes,
      maxPlayers: match.maxPlayers ?? MAX_PLAYERS,
      freeSeats: occupancy.free,
      playerNames: playerDocs
        .filter((doc) => doc !== null)
        .map((doc) => doc.name),
      guests: guests.map((guest) => ({
        name: guest.name,
        email: guest.email,
      })),
    };
  },
});
