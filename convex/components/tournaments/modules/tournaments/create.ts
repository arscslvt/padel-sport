import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export default mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.optional(v.string()),
  },
  async handler({ db }, args_0) {
    // Slug is a url-friendly version of the name, used for routing. If not provided, we can generate it from the name.
    const slug =
      args_0.slug ||
      args_0.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const existingTournamentBySlug = await db
      .query("tournaments")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existingTournamentBySlug) {
      throw new Error("A tournament with this name already exists.");
    }

    const tournamentId = await db.insert("tournaments", {
      name: args_0.name,
      slug,
      startDate: args_0.startDate,
      endDate: args_0.endDate,
      status: "upcoming",
    });

    return tournamentId;
  },
});
