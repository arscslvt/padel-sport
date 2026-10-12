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
 *
 * Con `withDeliveries` ogni prenotazione porta anche i suoi avvisi al cliente
 * (tables/bookingDeliveries.ts): è quello che la scheda mostra sotto
 * «Avvisi al cliente». Facoltativo perché i contatori della barra leggono la
 * stessa lista ogni minuto e non se ne fanno niente.
 */
export default query({
  args: {
    secret: v.string(),
    includePast: v.optional(v.boolean()),
    withDeliveries: v.optional(v.boolean()),
    status: v.optional(
      v.union(
        v.literal("pending_on_site_payment"),
        v.literal("accepted_on_site_payment"),
      ),
    ),
  },
  handler: async (
    ctx,
    { secret, includePast = true, withDeliveries = false, status },
  ) => {
    assertServer(secret);

    const now = Date.now();

    const bookings = status
      ? await ctx.db
          .query("bookings")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("bookings").withIndex("by_created_at").collect();

    const rows = bookings
      .filter((booking) => includePast || booking.bookingDate >= now)
      .sort((a, b) => a.bookingDate - b.bookingDate);

    if (!withDeliveries) return rows;

    return await Promise.all(
      rows.map(async (booking) => {
        const deliveries = await ctx.db
          .query("bookingDeliveries")
          .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
          .collect();

        return {
          ...booking,
          // L'id del provider serve ai webhook, non a chi guarda la scheda.
          deliveries: deliveries.map(({ providerId: _, ...delivery }) => delivery),
        };
      }),
    );
  },
});
