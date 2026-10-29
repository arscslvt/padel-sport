"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { internalAction } from "../../functions";
import {
  calendarConfig,
  deleteBooking,
  insertBooking,
  moveBooking,
} from "./client";
import { formatClubDateTime } from "../../utils/clubTime";
import { staffBookingUrl } from "../../utils/staffLinks";

/** I calendari del club, se li ha collegati (modules/clubs/config.ts). */
async function clubCalendar(ctx: ActionCtx, clubId: Id<"clubs">) {
  const club = await ctx.runQuery(internal.functions.clubForAction, { clubId });
  return calendarConfig(club);
}

/** Il titolo dell'evento: per SumUp ogni evento è un campo occupato. */
function summaryFor(court: string | undefined): string {
  return `Padel · ${court ?? "campo da assegnare"}`;
}

/**
 * Porta le nostre prenotazioni sul calendario condiviso, così che SumUp le
 * reimporti e smetta di offrire quell'orario.
 *
 * È l'altra metà del ponte: senza, sapremmo noi degli appuntamenti di SumUp ma
 * SumUp continuerebbe a non sapere nulla dei nostri.
 *
 * Un gruppo che prende più campi è un evento per campo: il primo sta in
 * `externalEventId`, gli altri in `extraExternalEventIds`. Pubblica solo
 * quelli che mancano, quindi si può chiamare quante volte si vuole.
 */
export default internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.runQuery(
      internal.modules.courtCalendar.data.bookingForCalendar,
      { bookingId },
    );
    // Il calendario è quello del club della prenotazione.
    const config = booking && (await clubCalendar(ctx, booking.clubId));
    if (!config) return;

    if (!booking || booking.status === "cancelled") return;

    const missingExtras = booking.extraCourts.slice(
      booking.extraEventIds.length,
    );
    if (booking.externalEventId && missingExtras.length === 0) return;

    const event = (court: string | undefined) => ({
      start: booking.start,
      end: booking.end,
      summary: summaryFor(court),
      description: [
        `Prenotazione dal sito a nome di ${booking.bookedBy}.`,
        booking.code ? `Codice ${booking.code}.` : null,
        "Evento creato dal gestionale del club: non modificarlo a mano.",
      ]
        .filter(Boolean)
        .join(" "),
    });

    try {
      if (!booking.externalEventId) {
        const eventId = await insertBooking(config, event(booking.court));
        if (eventId) {
          await ctx.runMutation(
            internal.modules.courtCalendar.data.attachEvent,
            { bookingId, eventId },
          );
        }
      }

      if (missingExtras.length > 0) {
        const created: string[] = [];
        for (const court of missingExtras) {
          const eventId = await insertBooking(config, event(court));
          if (eventId) created.push(eventId);
        }
        await ctx.runMutation(
          internal.modules.courtCalendar.data.attachExtraEvents,
          { bookingId, eventIds: [...booking.extraEventIds, ...created] },
        );
      }
    } catch (error) {
      // La prenotazione è già scritta: un calendario che non risponde non può
      // annullarla. Resta il rischio che SumUp offra lo stesso orario, e per
      // questo lo staff va avvisato.
      console.error("Prenotazione non pubblicata sul calendario:", error);

      await ctx.runAction(internal.modules.notifications.alert.default, {
        clubId: booking.clubId,
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
 * due. Se l'evento non c'è più, o non c'è mai stato, lo si crea da capo. Vale
 * per ogni campo di un gruppo che ne prende più d'uno: quelli in più rispetto
 * ai campi di adesso si tolgono.
 */
export const move = internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.runQuery(
      internal.modules.courtCalendar.data.bookingForCalendar,
      { bookingId },
    );
    // Il calendario è quello del club della prenotazione.
    const config = booking && (await clubCalendar(ctx, booking.clubId));
    if (!config) return;
    if (!booking || booking.status === "cancelled") return;

    const when = { start: booking.start, end: booking.end };

    try {
      const moved = booking.externalEventId
        ? await moveBooking(config, booking.externalEventId, {
            ...when,
            summary: summaryFor(booking.court),
          })
        : false;

      if (!moved && booking.externalEventId) {
        await ctx.runMutation(internal.modules.courtCalendar.data.attachEvent, {
          bookingId,
          eventId: undefined,
        });
      }

      // I campi in più: si spostano quelli che ci sono ancora, si tolgono
      // quelli di troppo. Quelli che mancano li ricrea `push.default`.
      const kept: string[] = [];
      for (const [index, court] of booking.extraCourts.entries()) {
        const eventId = booking.extraEventIds[index];
        if (!eventId) break;
        if (
          await moveBooking(config, eventId, {
            ...when,
            summary: summaryFor(court),
          })
        ) {
          kept.push(eventId);
        }
      }
      for (const eventId of booking.extraEventIds.slice(
        booking.extraCourts.length,
      )) {
        await deleteBooking(config, eventId);
      }
      if (kept.length !== booking.extraEventIds.length) {
        await ctx.runMutation(
          internal.modules.courtCalendar.data.attachExtraEvents,
          { bookingId, eventIds: kept },
        );
      }

      await ctx.runAction(internal.modules.courtCalendar.push.default, {
        bookingId,
      });
    } catch (error) {
      // Come alla creazione: la prenotazione è già spostata, ma SumUp potrebbe
      // offrire il nuovo orario a qualcun altro. Lo staff va avvisato.
      console.error("Evento della prenotazione non spostato:", error);

      await ctx.runAction(internal.modules.notifications.alert.default, {
        clubId: booking.clubId,
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
    const booking = await ctx.runQuery(
      internal.modules.courtCalendar.data.bookingForCalendar,
      { bookingId },
    );
    // Il calendario è quello del club della prenotazione.
    const config = booking && (await clubCalendar(ctx, booking.clubId));
    if (!config) return;

    if (!booking) return;
    if (!booking.externalEventId && booking.extraEventIds.length === 0) return;

    try {
      if (booking.externalEventId) {
        await deleteBooking(config, booking.externalEventId);
        await ctx.runMutation(
          internal.modules.courtCalendar.data.attachEvent,
          { bookingId, eventId: undefined },
        );
      }

      // Tutti i campi del gruppo tornano liberi su SumUp.
      for (const eventId of booking.extraEventIds) {
        await deleteBooking(config, eventId);
      }
      if (booking.extraEventIds.length > 0) {
        await ctx.runMutation(
          internal.modules.courtCalendar.data.attachExtraEvents,
          { bookingId, eventIds: [] },
        );
      }
    } catch (error) {
      console.error("Evento della prenotazione non rimosso:", error);
    }
  },
});
