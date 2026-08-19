import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { notificationStatus as notification } from "../tables/bookings";
import { api, internal } from "../_generated/api";
import { assertServer } from "../utils/serverSecret";

export const notificationStatus = internalMutation({
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

/**
 * Accetta una prenotazione: la conferma al cliente e gli manda il QR.
 *
 * È un atto della struttura, non del cliente, e va protetto come tale: finché
 * questa mutation è stata pubblica chiunque conoscesse l'URL del deployment
 * poteva confermare prenotazioni al posto dello staff, mail compresa.
 */
export const accept = mutation({
  args: {
    secret: v.string(),
    bookingId: v.id("bookings"),
    withNotification: v.optional(v.boolean()),
  },
  handler: async (ctx, { secret, bookingId, withNotification = true }) => {
    assertServer(secret);

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

    // La mail parte sempre: porta il QR d'ingresso, e senza quello il cliente
    // non ha modo di sapere che è stato accettato. Il WhatsApp invece resta a
    // discrezione di chi accetta, quindi non può essere l'unico canale.
    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.bookingMail.default,
      { bookingId, kind: "accepted" },
    );

    if (withNotification) {
      if (booking.notificationStatus !== "sent_with_whatsapp")
        await ctx.scheduler.runAfter(
          2000, // After 2 seconds
          internal.modules.notifications.confirmation
            .sendConfirmationWithWhatsapp,
          {
            bookingId,
          },
        );
    }

    return true;
  },
});
