import { v } from "convex/values";

import { internalMutation } from "../../functions";
import {
  deliveryChannel,
  deliveryEntry,
  deliveryStatus,
  notificationKind,
} from "../../tables/bookingDeliveries";
import { advances, alertFailure, recordDeliveries } from "./lib";

/**
 * Le due porte del registro degli avvisi ai clienti.
 *
 * `default` la usano le azioni che hanno appena tentato un invio
 * (notifications/bookingMail.ts, notifications/confirmation.ts): una riga per
 * destinatario, con l'id che il provider ha restituito. `fromProvider` la
 * usano i webhook (http.ts), che con quell'id ritrovano la riga e la fanno
 * maturare.
 */

export default internalMutation({
  args: {
    bookingId: v.id("bookings"),
    kind: notificationKind,
    channel: deliveryChannel,
    entries: v.array(deliveryEntry),
  },
  handler: async (ctx, { bookingId, kind, channel, entries }) => {
    await recordDeliveries(ctx, bookingId, kind, channel, entries);
  },
});

export const fromProvider = internalMutation({
  args: {
    providerId: v.string(),
    status: deliveryStatus,
    detail: v.optional(v.string()),
  },
  handler: async (ctx, { providerId, status, detail }) => {
    const row = await ctx.db
      .query("bookingDeliveries")
      .withIndex("by_provider_id", (q) => q.eq("providerId", providerId))
      .first();

    // Resend e Twilio avvisano per ogni messaggio dell'account, non solo per
    // quelli delle prenotazioni: le comunicazioni degli eventi, i punti. Un
    // id che qui non c'è non è un errore.
    if (!row) return { matched: false };

    if (!advances(row.status, status)) return { matched: true, changed: false };

    await ctx.db.patch(row._id, { status, detail, updatedAt: Date.now() });

    if (status === "failed") {
      const booking = await ctx.db.get(row.bookingId);
      if (booking) {
        await alertFailure(ctx, booking, { ...row, detail });

        // Il vecchio stato sulla prenotazione resta vero: lo legge chi
        // conferma, per non mandare il WhatsApp due volte.
        if (
          row.channel === "whatsapp" &&
          row.kind === "accepted" &&
          row.role === "booker"
        ) {
          await ctx.db.patch(booking._id, {
            notificationStatus: "failed_to_send_whatsapp",
          });
        }
      }
    }

    return { matched: true, changed: true };
  },
});
