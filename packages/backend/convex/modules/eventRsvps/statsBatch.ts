import { v } from "convex/values";
import { query } from "../../_generated/server";

/**
 * Conteggi di più moduli in una volta, per il selettore della dashboard: senza
 * questa, mostrare «quanti iscritti» accanto a ogni evento vorrebbe dire una
 * query per riga.
 *
 * Pubblica come `stats.ts`, e per lo stesso motivo: restituisce soli numeri.
 */
export default query({
  args: {
    forms: v.array(
      v.object({
        eventId: v.string(),
        blockKey: v.string(),
      }),
    ),
  },
  handler: async (ctx, { forms }) => {
    return await Promise.all(
      forms.map(async (form) => {
        const entries = await ctx.db
          .query("eventRsvps")
          .withIndex("by_form", (q) =>
            q.eq("eventId", form.eventId).eq("blockKey", form.blockKey),
          )
          .collect();

        const confirmed = entries.filter(
          (entry) => entry.status === "confirmed",
        );

        return {
          eventId: form.eventId,
          blockKey: form.blockKey,
          attendees: confirmed.length,
          seatsTaken: confirmed.reduce(
            (total, entry) => total + entry.guests + 1,
            0,
          ),
        };
      }),
    );
  },
});
