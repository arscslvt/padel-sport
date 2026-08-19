import { v } from "convex/values";
import { query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";

/**
 * Elenco completo delle iscrizioni a un modulo, dati personali inclusi.
 *
 * Protetta dal segreto condiviso, non dalla semplice presenza di una sessione:
 * l'URL del deployment è nel bundle del sito, e «essere loggati» lo è anche un
 * cliente qualunque — che non ha titolo per leggere le email degli iscritti a
 * un evento. Il controllo su chi è staff sta nella route che chiama.
 */
export default query({
  args: {
    secret: v.string(),
    eventId: v.string(),
    blockKey: v.string(),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

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
