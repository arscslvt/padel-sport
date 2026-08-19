import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction, internalQuery } from "../../_generated/server";
import { MATCH_DURATION_MS } from "../openMatches/lib";

/**
 * Le mail che seguono una prenotazione dopo che è stata creata: la conferma
 * della struttura e le disdette.
 *
 * Partono dal sito (là vivono Resend e i modelli), ma i destinatari stanno
 * qui: l'indirizzo degli ospiti non esce da nessuna query pubblica, e non
 * deve. Per questo il verso è Convex → sito e non il contrario — chi accetta o
 * annulla dalla dashboard è la struttura, non chi ha prenotato, e una query
 * leggibile dallo staff sarebbe una query leggibile da chiunque.
 *
 * Senza `SITE_URL` e `BOOKING_WEBHOOK_SECRET` non parte niente e resta solo una
 * riga nei log: l'accettazione e la disdetta restano valide, come sempre.
 */

/**
 * Cosa è successo alla prenotazione. Il QR viaggia solo con `accepted`: è
 * quello a dire al cliente che il campo è suo per davvero.
 */
const notificationKind = v.union(
  v.literal("accepted"),
  v.literal("cancelled_by_club"),
  v.literal("cancelled_by_player"),
);

export const payload = internalQuery({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) return null;

    const slot = await ctx.db.get(booking.slot);

    const match = await ctx.db
      .query("openMatches")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .first();

    const guests = match
      ? await ctx.db
          .query("matchGuests")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect()
      : [];

    // L'indirizzo di chi ha prenotato non è qui: sta su Clerk, e lo risolve il
    // sito partendo da questo identificativo.
    const creator = booking.createdByPlayer
      ? await ctx.db.get(booking.createdByPlayer)
      : null;

    return {
      code: booking.code,
      start: booking.bookingDate,
      end: booking.bookingDate + MATCH_DURATION_MS,
      court: slot?.name,
      bookedBy: booking.bookedBy,
      players: booking.players,
      bookerClerkUserId: creator?.clerkUserId,
      guests: guests
        .filter((guest) => guest.email)
        .map((guest) => ({ name: guest.name, email: guest.email as string })),
    };
  },
});

export default internalAction({
  args: {
    bookingId: v.id("bookings"),
    kind: notificationKind,
  },
  handler: async (ctx, { bookingId, kind }) => {
    const data = await ctx.runQuery(
      internal.modules.notifications.bookingMail.payload,
      { bookingId },
    );

    if (!data) return;

    const siteUrl = process.env.SITE_URL;
    const secret = process.env.BOOKING_WEBHOOK_SECRET;

    if (!siteUrl || !secret) {
      const missing = [
        siteUrl ? null : "SITE_URL",
        secret ? null : "BOOKING_WEBHOOK_SECRET",
      ].filter(Boolean);

      console.warn(
        `Mail della prenotazione non inviata: manca ${missing.join(" e ")} sul deployment Convex.`,
      );
      return;
    }

    // Nessuno a cui scrivere: né chi ha prenotato né ospiti con la mail.
    if (!data.bookerClerkUserId && data.guests.length === 0) return;

    try {
      const response = await fetch(`${siteUrl}/api/bookings/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-booking-webhook-secret": secret,
        },
        body: JSON.stringify({ ...data, kind }),
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      // Quel che doveva succedere è già successo: una mail che non parte non
      // lo annulla, ma lo staff deve saperlo per avvisare a voce.
      console.error("Mail della prenotazione non recapitata:", error);

      await ctx.runAction(internal.modules.notifications.alert.default, {
        title:
          kind === "accepted"
            ? "Conferma non comunicata"
            : "Disdetta non comunicata",
        message: `${data.bookedBy}, ${new Date(data.start).toLocaleString(
          "it-IT",
        )}: avvisare a mano.`,
        tags: ["booking", kind, "error"],
        priority: "high",
      });
    }
  },
});
