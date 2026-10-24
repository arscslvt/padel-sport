import { v } from "convex/values";
import { query } from "../_generated/server";
import { courtLabel, seatsOf } from "../modules/openMatches/lib";

/**
 * Prenotazione cercata per codice: è la pagina a cui punta il QR che finisce
 * nella mail di conferma, quindi la legge chi ha il codice e basta — nessuna
 * sessione.
 *
 * Per questo la vista è volutamente povera: data, campo, livello e nomi di
 * battesimo della squadra. Telefono, email e id restano fuori.
 */
export default query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, { code }) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;

    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .first();

    if (!booking) return null;

    return {
      code: normalized,
      bookingDate: booking.bookingDate,
      court: await courtLabel(ctx, booking),
      level: booking.level,
      players: booking.players,
      /** I posti in campo: quattro per campo occupato. */
      seats: seatsOf(booking),
      status: booking.status,
    };
  },
});
