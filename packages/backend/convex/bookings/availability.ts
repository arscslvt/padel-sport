import { v } from "convex/values";
import { query } from "../_generated/server";
import { externalBlocksBetween } from "../modules/courtCalendar/lib";
import { courtsOf } from "../modules/openMatches/lib";

/**
 * Occupazione dei campi in un intervallo, ridotta all'osso: la pagina
 * pubblica di prenotazione deve solo sapere *quando* e *su quale campo* c'è
 * già qualcuno, non chi sia né come si chiami.
 *
 * Sostituisce listRange nel flusso pubblico, che restituiva le prenotazioni
 * intere — telefono compreso — a chiunque aprisse il sito.
 *
 * Le prenotazioni cancellate non contano, come in findAvailableSlot
 * (modules/openMatches/lib.ts): lo slot liberato da una disdetta deve tornare
 * proponibile anche qui.
 *
 * Insieme arrivano le occupazioni esterne, quelle prese su SumUp. Restano un
 * elenco a parte e non si mescolano alle prenotazioni: qui una riga senza
 * `slot` blocca *tutti* i campi (è la semantica delle righe più vecchie),
 * mentre un'occupazione esterna ne toglie soltanto uno.
 */
export default query({
  args: {
    from: v.number(),
    to: v.number(),
  },
  handler: async (ctx, { from, to }) => {
    if (to <= from) return { busy: [], blocks: [] };

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_booking_date", (q) =>
        q.gte("bookingDate", from).lte("bookingDate", to),
      )
      .collect();

    const blocks = await externalBlocksBetween(ctx, from, to);

    return {
      busy: bookings
        .filter((booking) => booking.status !== "cancelled")
        // Una prenotazione su più campi è una riga per campo: chi legge
        // ragiona per campo, e non deve sapere che sono la stessa.
        .flatMap((booking) =>
          courtsOf(booking).map((slot) => ({
            bookingDate: booking.bookingDate,
            slot,
          })),
        ),
      blocks: blocks.map((block) => ({
        start: block.start,
        end: block.end,
      })),
    };
  },
});
