import { v } from "convex/values";
import { query } from "../../_generated/server";

/**
 * Quanti posti sono occupati su un modulo RSVP.
 *
 * È pubblica perché la usa il form del sito per mostrare i posti rimasti, e
 * per questo restituisce solo numeri: nessun nome, nessuna email. L'elenco
 * con i dati personali sta in `list.ts`, che richiede un'identità.
 */
export default query({
  args: {
    eventId: v.string(),
    blockKey: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("eventRsvps")
      .withIndex("by_form", (q) =>
        q.eq("eventId", args.eventId).eq("blockKey", args.blockKey),
      )
      .collect();

    const confirmed = entries.filter((entry) => entry.status === "confirmed");

    return {
      attendees: confirmed.length,
      seatsTaken: confirmed.reduce(
        (total, entry) => total + entry.guests + 1,
        0,
      ),
    };
  },
});
