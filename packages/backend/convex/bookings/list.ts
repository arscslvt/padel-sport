import { v } from "convex/values";
import { query } from "../_generated/server";
import { assertServer } from "../utils/serverSecret";

/**
 * L'agenda completa della struttura: nomi, telefoni e codici d'ingresso.
 *
 * Riservata allo staff, e protetta dal segreto condiviso: l'URL del deployment
 * sta nel bundle del sito, quindi una query pubblica su questa tabella sarebbe
 * un elenco di clienti con i loro numeri scaricabile da chiunque. Chi è staff
 * lo sa Clerk, e il controllo vero sta nella route che chiama
 * (app/api/dashboard/bookings).
 */
export default query({
  args: {
    secret: v.string(),
    includePast: v.optional(v.boolean()),
    status: v.optional(
      v.union(
        v.literal("pending_on_site_payment"),
        v.literal("accepted_on_site_payment"),
      ),
    ),
  },
  handler: async (ctx, { secret, includePast = true, status }) => {
    assertServer(secret);

    const now = Date.now();

    const bookings = status
      ? await ctx.db
          .query("bookings")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("bookings").withIndex("by_created_at").collect();

    return bookings
      .filter((booking) => includePast || booking.bookingDate >= now)
      .sort((a, b) => a.bookingDate - b.bookingDate);
  },
});
