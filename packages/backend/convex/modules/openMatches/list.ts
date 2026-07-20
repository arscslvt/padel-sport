import { query } from "../../_generated/server";
import { toMatchView } from "./lib";

/** Partite aperte future con posti liberi, ordinate per data. */
export default query({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db
      .query("openMatches")
      .withIndex("by_status_date", (q) =>
        q.eq("status", "open").gte("matchDate", Date.now()),
      )
      .order("asc")
      .take(50);

    return await Promise.all(matches.map((match) => toMatchView(ctx, match)));
  },
});
