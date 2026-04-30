import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { notificationStatus as notification } from "../tables/bookings";
import { api, internal } from "../_generated/api";

export const notificationStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    newStatus: notification,
  },
  handler: async (ctx, { bookingId, newStatus }) => {
    const booking = await ctx.db.get(bookingId);

    if (!booking) {
      throw new Error("Prenotazione non trovata.");
    }

    await ctx.db.patch(bookingId, {
      notificationStatus: newStatus,
    });
  },
});

export const accept = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.runQuery(api.bookings.get.getById, {
      bookingId,
    });

    if (!booking) {
      throw new Error("Prenotazione non trovata.");
    }

    if (booking.status === "accepted_on_site_payment") {
      return bookingId;
    }

    await ctx.db.patch(bookingId, {
      status: "accepted_on_site_payment",
    });

    await ctx.scheduler.runAfter(
      2000, // After 2 seconds
      internal.modules.notifications.confirmation.sendConfirmationWithWhatsapp,
      {
        userFirstName: booking.bookedBy,
        userPhoneNumber: booking.phone || "",
        date: new Date(booking.bookingDate).toISOString(),
        bookingCode: booking.code || "",
      },
    );

    return true;
  },
});
