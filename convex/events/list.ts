import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";
import { v } from "convex/values";

export default query({
  args: {
    paginationOpts: paginationOptsValidator,
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_date", (q) => q.gt("date", args.now))
      .order("desc")
      .paginate(args.paginationOpts);

    return events;
  },
});
