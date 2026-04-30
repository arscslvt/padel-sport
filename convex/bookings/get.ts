import { v } from "convex/values";
import { query } from "../_generated/server";

export const getById = query({
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
