import { v } from "convex/values";
import { query } from "../../_generated/server";

/**
 * L'iscrizione dietro un link di annullamento, per la pagina di conferma.
 *
 * Pubblica come la mutation gemella — il token fa da credenziale — ma
 * restituisce il minimo che serve a far riconoscere l'iscrizione a chi ha
 * aperto il link: niente email, che a quel punto sarebbe un dato in più
 * mostrato a chiunque abbia il link sotto mano.
 */
export default query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    const rsvp = await ctx.db
      .query("eventRsvps")
      .withIndex("by_cancel_token", (q) => q.eq("cancelToken", token))
      .unique();

    if (!rsvp) return null;

    return {
      name: rsvp.name,
      guests: rsvp.guests,
      seats: rsvp.guests + 1,
      status: rsvp.status,
      eventSlug: rsvp.eventSlug,
      eventTitle: rsvp.eventTitle,
      createdAt: rsvp.createdAt,
      cancelledAt: rsvp.cancelledAt,
    };
  },
});
