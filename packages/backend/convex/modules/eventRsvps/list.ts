import { v } from "convex/values";
import { query } from "../../_generated/server";

/**
 * Elenco completo delle iscrizioni a un modulo, dati personali inclusi.
 *
 * A differenza delle altre query pubbliche del backend, questa pretende
 * un'identità: l'URL del deployment è nel bundle del sito, quindi senza
 * controllo chiunque potrebbe scaricarsi gli indirizzi email degli iscritti.
 * Il filtro «solo staff» sta un livello sopra, nella route che la chiama.
 */
export default query({
  args: {
    eventId: v.string(),
    blockKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Serve un accesso per leggere le iscrizioni.");
    }

    const entries = await ctx.db
      .query("eventRsvps")
      .withIndex("by_form", (q) =>
        q.eq("eventId", args.eventId).eq("blockKey", args.blockKey),
      )
      .collect();

    return entries
      .filter((entry) => entry.status === "confirmed")
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((entry) => ({
        id: entry._id,
        name: entry.name,
        email: entry.email,
        guests: entry.guests,
        seats: entry.guests + 1,
        createdAt: entry.createdAt,
        notifiedAt: entry.notifiedAt,
      }));
  },
});
