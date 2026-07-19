import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";
import { v } from "convex/values";

export default query({
  args: {
    paginationOpts: paginationOptsValidator,
    now: v.optional(v.number()),
    referenceTime: v.optional(
      v.object({
        from: v.float64(),
        to: v.float64(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const baseQuery = ctx.db
      .query("events")
      .withIndex("by_date", (q) => q.gt("date", 0))
      .order("desc");

    try {
      return await baseQuery.paginate(args.paginationOpts);
    } catch (error) {
      // During convex dev, previously issued cursors can become invalid after query changes.
      if (
        error instanceof Error &&
        error.message.includes("InvalidCursor") &&
        args.paginationOpts.cursor !== null
      ) {
        return await baseQuery.paginate({
          ...args.paginationOpts,
          cursor: null,
          endCursor: null,
        });
      } else {
        throw error;
      }
    }
  },
});
