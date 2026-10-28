import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { serverMutation, serverQuery } from "../functions";
import {
  courtsAt,
  courtsOf,
  joinCourtNames,
} from "../modules/openMatches/lib";

/**
 * Lo staff cambia il campo di una prenotazione, alla stessa ora.
 *
 * Serve a riempire i buchi che l'assegnazione automatica non può prevedere
 * (modules/openMatches/lib.ts, `pickCourt`), o a rispettare una richiesta del
 * cliente. Il campo nuovo deve essere libero a quell'ora; gli appuntamenti di
 * SumUp non contano, perché scambiare campo non ne occupa uno in più.
 *
 * Due prenotazioni unite dividono lo stesso campo: si spostano insieme. Una
 * prenotazione su più campi ne sceglie altrettanti: i posti restano quelli.
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

export const options = serverQuery({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");

    if (booking.status === "cancelled") {
      return {
        blocker: "La prenotazione è stata annullata.",
        shared: false,
        count: 1,
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
    const mine = courtsOf(booking);

    const all = await ctx.db.query("slots").collect();
    const courts = all
      .filter((court) => court.active || mine.includes(court._id))
      .sort((a, b) => a.name.localeCompare(b.name, "it", { numeric: true }))
      .map((court) => ({
        id: court._id,
        name: court.name,
        current: mine.includes(court._id),
        available: !mine.includes(court._id) && freeIds.has(court._id),
      }));

    return {
      blocker: null,
      shared: group.length > 1,
      /** Quanti campi va scelti: quanti ne occupa adesso. */
      count: mine.length,
      courts,
    };
  },
});

export const move = serverMutation({
  args: {
    bookingId: v.id("bookings"),
    /** I campi nuovi, tanti quanti ne occupa la prenotazione. */
    slotIds: v.array(v.id("slots")),
  },
  handler: async (ctx, { bookingId, slotIds }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");
    if (booking.status === "cancelled") {
      throw new Error("La prenotazione è stata annullata.");
    }

    const mine = courtsOf(booking);
    const chosen = [...new Set(slotIds)];
    if (chosen.length !== mine.length) {
      throw new Error(
        mine.length === 1
          ? "Scegli un campo."
          : `Scegli ${mine.length} campi diversi.`,
      );
    }
    if (chosen.every((id) => mine.includes(id))) {
      throw new Error(
        mine.length === 1
          ? "Scegli un campo diverso da quello attuale."
          : "Scegli almeno un campo diverso da quelli attuali.",
      );
    }

    const courts = await Promise.all(chosen.map((id) => ctx.db.get(id)));
    if (courts.some((court) => !court?.active)) {
      throw new Error("Questo campo non è disponibile.");
    }

    const group = await groupOf(ctx, booking);
    const ids: Id<"bookings">[] = group.map((member) => member._id);
    const { free } = await courtsAt(ctx, booking.bookingDate, ids);
    if (!chosen.every((id) => free.some((candidate) => candidate._id === id))) {
      throw new Error("Questo campo è occupato a quest'ora. Scegline un altro.");
    }

    // Il primo resta `slot`: le prenotazioni su un campo solo non cambiano
    // forma, e quelle unite (sempre su un campo) lo dividono ancora.
    const [slotId, ...extraSlots] = chosen;
    for (const member of group) {
      await ctx.db.patch(member._id, {
        slot: slotId,
        extraSlots: extraSlots.length > 0 ? extraSlots : undefined,
      });

      // Il campo sta nel titolo dell'evento sul calendario condiviso.
      await ctx.scheduler.runAfter(
        0,
        internal.modules.courtCalendar.push.move,
        { bookingId: member._id },
      );
    }

    return {
      court: joinCourtNames(courts.map((court) => court?.name ?? "")),
      moved: group.length,
    };
  },
});
