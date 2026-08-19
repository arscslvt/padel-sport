import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { assertServer } from "../utils/serverSecret";
import { releaseMerge } from "./lib";

/**
 * Annulla una prenotazione dalla dashboard, avvisando il cliente.
 *
 * Prima bastava essere autenticati: un cliente qualunque poteva cancellare la
 * partita di un altro, mail di disdetta compresa. Ora è riservata alla
 * struttura, come l'accettazione.
 */
export default mutation({
  args: {
    secret: v.string(),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { secret, bookingId }) => {
    assertServer(secret);

    // Prima di annullare: se il campo era condiviso, l'altro gruppo resta e
    // va rimesso su un campo tutto suo (bookings/lib.ts).
    await releaseMerge(ctx, bookingId);

    await ctx.db.patch(bookingId, {
      status: "cancelled",
    });

    // Il campo torna libero anche su SumUp, che legge il calendario condiviso.
    await ctx.scheduler.runAfter(
      0,
      internal.modules.courtCalendar.push.remove,
      { bookingId },
    );

    // Qui annulla la struttura: chi aveva prenotato non lo sa, va avvisato.
    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.bookingMail.default,
      { bookingId, kind: "cancelled_by_club" },
    );
  },
});
