import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { DEFAULT_CLUB_SLUG } from "./lib";

/**
 * Crea la riga di Padel Sport, se manca. Si lancia una volta per deployment:
 *
 *   bunx convex run modules/clubs/seed:padelSport
 *
 * Ripeterla non fa danni: se la riga c'è già la lascia com'è. L'organizzazione
 * Clerk si può passare ora (`{ clerkOrgId: "org_…" }`) o più avanti, quando
 * servirà alla dashboard: dev e prod ne hanno due diverse.
 */
export const padelSport = internalMutation({
  args: { clerkOrgId: v.optional(v.string()) },
  handler: async (ctx, { clerkOrgId }) => {
    const existing = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", DEFAULT_CLUB_SLUG))
      .unique();
    if (existing) return { clubId: existing._id, created: false };

    const clubId = await ctx.db.insert("clubs", {
      slug: DEFAULT_CLUB_SLUG,
      name: "ASD Padel Sport Melilli",
      // Gli stessi valori di utils/clubTime.ts e modules/weather/refresh.ts.
      timeZone: "Europe/Rome",
      latitude: 37.1777,
      longitude: 15.1418,
      clerkOrgId,
    });
    return { clubId, created: true };
  },
});
