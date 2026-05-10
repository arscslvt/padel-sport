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

    return tournaments;
  },
});

export { bySlug };
