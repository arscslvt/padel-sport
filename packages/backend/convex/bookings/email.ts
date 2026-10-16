import { v } from "convex/values";

import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import {
  emailRetryTargets,
  hasEmailRetry,
  onlyTarget,
} from "../modules/deliveries/retry";
import { MATCH_DURATION_MINUTES } from "../modules/openMatches/lib";
import { assertServer } from "../utils/serverSecret";

/**
 * La mail di conferma, rimandata dallo staff a chi non l'ha ricevuta.
 *
 * È la gemella del reinvio WhatsApp (bookings/whatsapp.ts), con una
 * differenza: l'indirizzo non si corregge qui. Quello di chi ha un account sta
 * su Clerk, gli altri nella scheda cliente; lo staff li sistema lì, e da qui
 * riparte la mail. Va solo a chi l'aspetta ancora (modules/deliveries/retry.ts):
 * chi l'ha già ricevuta non ne trova una seconda.
 *
 * Passa dalla route della dashboard (api/dashboard/bookings/email), che ha
 * già verificato che chi chiede è dello staff.
 */
export const resend = mutation({
  args: {
    secret: v.string(),
    bookingId: v.id("bookings"),
    /**
     * Solo questa persona, fra chi la aspetta: chi ha prenotato, un
     * giocatore, o un ospite riconosciuto dall'indirizzo. Senza, tutti.
     */
    target: v.optional(
      v.union(
        v.object({ role: v.literal("booker") }),
        v.object({ role: v.literal("player"), playerId: v.id("players") }),
        v.object({ role: v.literal("guest"), email: v.string() }),
      ),
    ),
  },
  handler: async (ctx, { secret, bookingId, target }) => {
    assertServer(secret);

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");

    if (booking.status !== "accepted_on_site_payment") {
      throw new Error(
        "La mail di conferma si manda solo per le prenotazioni confermate.",
      );
    }
    if (booking.bookingDate + MATCH_DURATION_MINUTES * 60_000 < Date.now()) {
      throw new Error("La partita è già finita.");
    }

    const deliveries = await ctx.db
      .query("bookingDeliveries")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .collect();

    const targets = onlyTarget(emailRetryTargets(booking, deliveries), target);
    if (!hasEmailRetry(targets)) {
      throw new Error(
        "Nessuna mail da rimandare: chi doveva riceverla l'ha già avuta o ce l'ha in arrivo.",
      );
    }

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.bookingMail.default,
      {
        bookingId,
        kind: "accepted",
        only: {
          booker: targets.booker,
          playerIds: targets.playerIds,
          guestEmails: targets.guestEmails,
        },
      },
    );

    return { names: targets.names };
  },
});
