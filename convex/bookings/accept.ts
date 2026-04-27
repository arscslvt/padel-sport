import { v } from "convex/values";
import { mutation } from "../_generated/server";

export default mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);

    if (!booking) {
      throw new Error("Prenotazione non trovata.");
    }

    if (booking.status === "accepted_on_site_payment") {
      return bookingId;
    }

    await ctx.db.patch(bookingId, {
      status: "accepted_on_site_payment",
    });

    return bookingId;
  },
});
