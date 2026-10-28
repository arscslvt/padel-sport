import { v } from "convex/values";
import { internalQuery } from "../functions";

/**
 * Una prenotazione intera, telefono compreso: solo per il backend. Era una
 * query pubblica, e chiunque avesse un id poteva leggerla.
 */
export const getById = internalQuery({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      throw new Error("Prenotazione non trovata");
    }
    return booking;
  },
});
