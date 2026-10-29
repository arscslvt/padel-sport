import { v } from "convex/values";

import { internalMutation } from "../../functions";
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

/**
 * Collega l'organizzazione Clerk dello staff a un club: da lì il gestionale
 * sa di quale club è chi lo usa (`serverQuery` e simili, functions.ts). Si
 * lancia una volta per deployment, con l'organizzazione di quell'istanza
 * Clerk (dev e prod ne hanno due diverse):
 *
 *   bunx convex run modules/clubs/seed:linkOrganization '{"clerkOrgId": "org_…"}' [--prod]
 *
 * Senza `slug` è Padel Sport. Ripeterla non fa danni; un'organizzazione già
 * di un altro club invece si rifiuta, perché il suo staff vedrebbe due club.
 */
export const linkOrganization = internalMutation({
  args: { clerkOrgId: v.string(), slug: v.optional(v.string()) },
  handler: async (ctx, { clerkOrgId, slug = DEFAULT_CLUB_SLUG }) => {
    if (!clerkOrgId.startsWith("org_")) {
      throw new Error("L'organizzazione Clerk comincia con org_.");
    }

    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!club) throw new Error(`Nessun club con lo slug ${slug}.`);

    const owner = await ctx.db
      .query("clubs")
      .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", clerkOrgId))
      .unique();
    if (owner && owner._id !== club._id) {
      throw new Error(`L'organizzazione è già del club ${owner.slug}.`);
    }

    if (club.clerkOrgId === clerkOrgId) return { clubId: club._id, changed: false };
    await ctx.db.patch(club._id, { clerkOrgId });
    return { clubId: club._id, changed: true };
  },
});
