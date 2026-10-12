"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import {
  calendarConfig,
  deleteBooking,
  insertBooking,
  moveBooking,
} from "./client";
import { formatClubDateTime } from "../../utils/clubTime";
import { staffBookingUrl } from "../../utils/staffLinks";

/**
 * Porta le nostre prenotazioni sul calendario condiviso, così che SumUp le
 * reimporti e smetta di offrire quell'orario.
 *
 * È l'altra metà del ponte: senza, sapremmo noi degli appuntamenti di SumUp ma
 * SumUp continuerebbe a non sapere nulla dei nostri.
 */
export default internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const config = calendarConfig();
    if (!config) return;

    const booking = await ctx.runQuery(
      internal.modules.courtCalendar.data.bookingForCalendar,
      { bookingId },
    );

    if (!booking || booking.status === "cancelled") return;
    if (booking.externalEventId) return;

    try {
      const eventId = await insertBooking(config, {
        start: booking.start,
        end: booking.end,
        summary: `Padel · ${booking.court ?? "campo da assegnare"}`,
        description: [
          `Prenotazione dal sito a nome di ${booking.bookedBy}.`,
          booking.code ? `Codice ${booking.code}.` : null,
          "Evento creato dal gestionale del club: non modificarlo a mano.",
        ]
          .filter(Boolean)
          .join(" "),
      });

      if (eventId) {
        await ctx.runMutation(
          internal.modules.courtCalendar.data.attachEvent,
          { bookingId, eventId },
        );
      }
    } catch (error) {
      // La prenotazione è già scritta: un calendario che non risponde non può
      // annullarla. Resta il rischio che SumUp offra lo stesso orario, e per
      // questo lo staff va avvisato.
      console.error("Prenotazione non pubblicata sul calendario:", error);

      await ctx.runAction(internal.modules.notifications.alert.default, {
        category: "system",
        title: "⚠️ Prenotazione non sincronizzata con SumUp",
        message: `${booking.bookedBy}, ${formatClubDateTime(
          booking.start,
        )}: bloccare l'orario su SumUp a mano.`,
        url: staffBookingUrl(bookingId),
        idempotencyKey: `calendar-push-error-${bookingId}`,
      });
    }
  },
});

/**
 * Sposta sul calendario una prenotazione a cui lo staff ha cambiato orario: il
 * vecchio orario torna libero su SumUp, il nuovo si occupa.
 *
 * Si aggiorna l'evento che c'è invece di toglierlo e rimetterlo: due azioni in
 * parallelo potrebbero incrociarsi e lasciare il calendario senza nessuno dei
 * due. Se l'evento non c'è più, o non c'è mai stato, lo si crea da capo.
 */
export const move = internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const config = calendarConfig();
    if (!config) return;

    const booking = await ctx.runQuery(
      internal.modules.courtCalendar.data.bookingForCalendar,
      { bookingId },
    );
    if (!booking || booking.status === "cancelled") return;

    try {
      const moved = booking.externalEventId
        ? await moveBooking(config, booking.externalEventId, {
            start: booking.start,
            end: booking.end,
            summary: `Padel · ${booking.court ?? "campo da assegnare"}`,
          })
        : false;

      if (moved) return;

      if (booking.externalEventId) {
        await ctx.runMutation(internal.modules.courtCalendar.data.attachEvent, {
          bookingId,
          eventId: undefined,
        });
      }
      await ctx.runAction(internal.modules.courtCalendar.push.default, {
        bookingId,
      });
    } catch (error) {
      // Come alla creazione: la prenotazione è già spostata, ma SumUp potrebbe
      // offrire il nuovo orario a qualcun altro. Lo staff va avvisato.
      console.error("Evento della prenotazione non spostato:", error);

      await ctx.runAction(internal.modules.notifications.alert.default, {
        category: "system",
        title: "⚠️ Cambio d'orario non sincronizzato con SumUp",
        message: `${booking.bookedBy}, ora alle ${formatClubDateTime(
          booking.start,
        )}: aggiorna l'orario su SumUp a mano.`,
        url: staffBookingUrl(bookingId),
        idempotencyKey: `calendar-move-error-${bookingId}-${booking.start}`,
      });
    }
  },
});

/** Toglie dal calendario la prenotazione disdetta, liberando l'orario su SumUp. */
export const remove = internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const config = calendarConfig();
    if (!config) return;

    const booking = await ctx.runQuery(
      internal.modules.courtCalendar.data.bookingForCalendar,
      { bookingId },
    );

    if (!booking?.externalEventId) return;

    try {
      await deleteBooking(config, booking.externalEventId);

      await ctx.runMutation(internal.modules.courtCalendar.data.attachEvent, {
        bookingId,
        eventId: undefined,
      });
    } catch (error) {
      console.error("Evento della prenotazione non rimosso:", error);
    }
  },
});
