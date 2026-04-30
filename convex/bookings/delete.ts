import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

export default action({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new Error("Unauthorized");
    }

    await ctx.runMutation(internal.bookings.delete.deleteBooking, {
      bookingId: bookingId,
    });
  },
});

export const deleteBooking = internalMutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    await ctx.db.delete("bookings", bookingId);
  },
});
