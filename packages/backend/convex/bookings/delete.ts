import { v } from "convex/values";
import { mutation } from "../_generated/server";

export default mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(bookingId, {
      status: "cancelled",
    });
  },
});
