import { query } from "../_generated/server";
import { v } from "convex/values";

export default query({
  args: {
    from: v.number(),
    to: v.number(),
  },
  handler: async (ctx, { from, to }) => {
    if (to <= from) {
      return [];
    }

    return await ctx.db
      .query("bookings")
      .withIndex("by_booking_date", (q) =>
        q.gte("bookingDate", from).lt("bookingDate", to),
      )
      .collect();
  },
});
