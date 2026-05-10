import { components } from "@/convex/_generated/api";
import { query } from "@/convex/_generated/server";
import type { Doc } from "@/convex/components/tournaments/_generated/dataModel";
import { v } from "convex/values";

const bySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    const tournamentData = (await ctx.runQuery(
      components.tournaments.modules.tournaments.get.bySlug,
      {
        slug,
      },
    )) as Doc<"tournaments"> | null;

    return tournamentData;
  },
});

export { bySlug };
