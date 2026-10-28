import { components } from "../../_generated/api";
import type { Doc } from "../../components/tournaments/_generated/dataModel";
import { clubQuery } from "../../functions";
import { v } from "convex/values";

const bySlug = clubQuery({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    try {
      const tournamentData = (await ctx.runQuery(
        components.tournaments.modules.tournaments.get.bySlug,
        {
          slug,
        },
      )) as Doc<"tournaments"> | null;

      return tournamentData;
    } catch (error) {
      console.error("Error fetching tournament by slug:", error);
      return null; // or handle the error as needed
    }
  },
});

export { bySlug };

const list = clubQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.tournaments.modules.tournaments.get.list);
  }
});

export { list };
