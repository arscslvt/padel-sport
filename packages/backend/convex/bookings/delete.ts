import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { releaseMerge } from "./lib";

export default mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new Error("Unauthorized");
    }

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
