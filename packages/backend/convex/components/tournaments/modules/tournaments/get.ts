import { v } from "convex/values";
import { query } from "../../_generated/server";

const bySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async ({ db }, { slug }) => {
    const tournaments = await db
      .query("tournaments")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!tournaments) {
      throw new Error("Tournament not found");
    }

    return tournaments;
  },
});

export { bySlug };

const list = query({
  args: {},
  handler: async ({ db }) => {
    return await db.query("tournaments").collect();
  },
});

export { list };
