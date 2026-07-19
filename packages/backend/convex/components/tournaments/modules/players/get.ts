import { v } from "convex/values";
import { query } from "../../_generated/server";

const search = query({
  args: {
    query: v.string(),
  },
  async handler({ db }, args_0) {
    const players = await db
      .query("players")
      .withSearchIndex("search_by_name", (q) =>
        q.search("firstName", args_0.query),
      )
      .collect();

    return players;
  },
});

const byFullName = query({
  args: {
    firstName: v.string(),
    lastName: v.string(),
  },
  async handler({ db }, args_0) {
    const players = await db
      .query("players")
      .withIndex("by_full_name", (q) =>
        q.eq("firstName", args_0.firstName).eq("lastName", args_0.lastName),
      )
      .collect();

    return players;
  },
});

export { search, byFullName };
