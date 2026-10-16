import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { onlinePayments } from "../modules/payments/lib";
import { assertServer } from "../utils/serverSecret";
import {
  notifiedPlayers,
  whatsappPhone,
} from "../modules/notifications/bookingPlayers";

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
 * «Avvisi al cliente». E, se è stata pagata online, i riferimenti degli
 * incassi — rimborsati compresi — per ritrovarli su SumUp. Facoltativo perché i contatori della barra leggono la
 * stessa lista ogni minuto e non se ne fanno niente.
 */
/**
 * Chi ha fatto la prenotazione, per l'indicatore dell'agenda: il cliente da
 * sé (dal sito, dall'app, o non si sa più da dove) oppure lo staff.
 *
 * Le prenotazioni nuove lo portano scritto (`source`). Per quelle di prima la
 * si ricava dalla partita: sito e app ne creano sempre una, il gestionale mai.
 */
async function originOf(
  ctx: QueryCtx,
  booking: Doc<"bookings">,
): Promise<"web" | "app" | "client" | "staff"> {
  if (booking.source) return booking.source;

  const match = await ctx.db
    .query("openMatches")
    .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
    .first();

  return match ? "client" : "staff";
}

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

        // Anche una prenotazione tornata «in struttura» può avere un incasso
        // rimborsato da mostrare: si legge per tutte, è un indice.
        const payments = await onlinePayments(ctx, booking._id);

        // I giocatori collegati, anche quelli che nessun avviso ha ancora
        // raggiunto (le prenotazioni confermate prima che la conferma
        // andasse a tutti): la scheda li mostra e permette di avvisarli.
        const linkedPlayers = (await notifiedPlayers(ctx, booking)).map(
          (player) => ({
            playerId: player._id,
            name: player.name,
            phone: whatsappPhone(player.phone),
            // L'indirizzo di chi ha un account sta su Clerk: lo trova il sito.
            hasEmail: Boolean(player.email || player.clerkUserId),
          }),
        );

        return {
          ...booking,
          // L'id del provider serve ai webhook, non a chi guarda la scheda.
          deliveries: deliveries.map(({ providerId: _, ...delivery }) => delivery),
          payments: payments.length > 0 ? payments : undefined,
          linkedPlayers,
          // Il numero nella scheda di chi ha prenotato: la scheda lo propone
          // quando quello della prenotazione è diverso o manca.
          bookerCardPhone: booking.createdByPlayer
            ? whatsappPhone(
                (await ctx.db.get(booking.createdByPlayer))?.phone,
              )
            : undefined,
          origin: await originOf(ctx, booking),
        };
      }),
    );
  },
});
