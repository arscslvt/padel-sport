import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, type QueryCtx, query } from "../_generated/server";
import { courtsAt } from "../modules/openMatches/lib";
import { assertServer } from "../utils/serverSecret";

/**
 * Lo staff cambia il campo di una prenotazione, alla stessa ora.
 *
 * Serve a riempire i buchi che l'assegnazione automatica non può prevedere
 * (modules/openMatches/lib.ts, `pickCourt`), o a rispettare una richiesta del
 * cliente. Il campo nuovo deve essere libero a quell'ora; gli appuntamenti di
 * SumUp non contano, perché scambiare campo non ne occupa uno in più.
 *
 * Due prenotazioni unite dividono lo stesso campo: si spostano insieme.
 *
 * Passa dalla route della dashboard (api/dashboard/bookings/court), che ha già
 * verificato con Clerk che chi chiede è dello staff.
 */

/** La prenotazione e la compagna con cui divide il campo, se c'è. */
async function groupOf(
  ctx: QueryCtx,
  booking: Doc<"bookings">,
): Promise<Doc<"bookings">[]> {
  const partner = booking.mergedWith
    ? await ctx.db.get(booking.mergedWith)
    : null;

  return partner && partner.status !== "cancelled"
    ? [booking, partner]
    : [booking];
}

export const options = query({
  args: { secret: v.string(), bookingId: v.id("bookings") },
  handler: async (ctx, { secret, bookingId }) => {
    assertServer(secret);

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");

    if (booking.status === "cancelled") {
      return {
        blocker: "La prenotazione è stata annullata.",
        shared: false,
        courts: [],
      };
    }

    const group = await groupOf(ctx, booking);
    const { free } = await courtsAt(
      ctx,
      booking.bookingDate,
      group.map((member) => member._id),
    );
    const freeIds = new Set(free.map((court) => court._id));

    const all = await ctx.db.query("slots").collect();
    const courts = all
      .filter((court) => court.active || court._id === booking.slot)
      .sort((a, b) => a.name.localeCompare(b.name, "it", { numeric: true }))
      .map((court) => ({
        id: court._id,
        name: court.name,
        current: court._id === booking.slot,
        available: court._id !== booking.slot && freeIds.has(court._id),
      }));

    return { blocker: null, shared: group.length > 1, courts };
  },
});

export const move = mutation({
  args: {
    secret: v.string(),
    bookingId: v.id("bookings"),
    slotId: v.id("slots"),
  },
  handler: async (ctx, { secret, bookingId, slotId }) => {
    assertServer(secret);

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");
    if (booking.status === "cancelled") {
      throw new Error("La prenotazione è stata annullata.");
    }
    if (booking.slot === slotId) {
      throw new Error("Scegli un campo diverso da quello attuale.");
    }

    const court = await ctx.db.get(slotId);
    if (!court?.active) throw new Error("Questo campo non è disponibile.");

    const group = await groupOf(ctx, booking);
    const ids: Id<"bookings">[] = group.map((member) => member._id);
    const { free } = await courtsAt(ctx, booking.bookingDate, ids);
    if (!free.some((candidate) => candidate._id === slotId)) {
      throw new Error("Questo campo è occupato a quest'ora. Scegline un altro.");
    }

    for (const member of group) {
      await ctx.db.patch(member._id, { slot: slotId });

      // Il campo sta nel titolo dell'evento sul calendario condiviso.
      await ctx.scheduler.runAfter(
        0,
        internal.modules.courtCalendar.push.move,
        { bookingId: member._id },
      );
    }

    return { court: court.name, moved: group.length };
  },
});
