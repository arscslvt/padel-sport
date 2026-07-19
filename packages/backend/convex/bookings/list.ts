import { v } from "convex/values";
import { query } from "../_generated/server";

export default query({
  args: {
    includePast: v.optional(v.boolean()),
    status: v.optional(
      v.union(
        v.literal("pending_on_site_payment"),
        v.literal("accepted_on_site_payment"),
      ),
    ),
  },
  handler: async (ctx, { includePast = true, status }) => {
    const now = Date.now();

    const bookings = status
      ? await ctx.db
          .query("bookings")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("bookings").withIndex("by_created_at").collect();

    return bookings
      .filter((booking) => includePast || booking.bookingDate >= now)
      .sort((a, b) => a.bookingDate - b.bookingDate);
  },
});
