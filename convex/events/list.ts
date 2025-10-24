import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";

export default query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args_0) => {
    const events = await ctx.db
      .query("events")
      .order("desc")
      .filter((q) => q.gt(q.field("date"), Date.now()))
      .paginate(args_0.paginationOpts);

    return events;
  },
});
