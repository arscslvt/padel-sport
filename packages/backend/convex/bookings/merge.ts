import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import {
  findAvailableSlot,
  MAX_PLAYERS,
  syncMatchStatus,
} from "../modules/openMatches/lib";
import { assertServer } from "../utils/serverSecret";

/**
 * Unire due prenotazioni parziali in un campo solo.
 *
 * Chi prenota dal sito o dall'app può farlo anche senza essere in quattro: il
 * club si prende l'incarico di trovare i mancanti. Quando a chiederlo sono due
 * gruppi per la stessa ora, i giocatori sono già quattro e i campi occupati
 * due: unirli è il gesto che la struttura fa al telefono, qui reso reversibile
 * e senza dimenticanze.
 *
 * Le prenotazioni restano **due**: ognuna tiene il suo codice, il suo QR e il
 * suo prenotante, perché ognuna è un accordo a sé con la struttura. Cambia
 * soltanto il campo, che diventa lo stesso — ed è da lì che discende tutto il
 * resto senza casi speciali, `findAvailableSlot` compreso, che ragiona per
 * campo e non per prenotazione.
 *
 * Il segreto è la seconda serratura: la prima è la sessione dello staff,
 * verificata dalla route che chiama (app/api/dashboard/bookings/merge).
 */

/** La partita costruita sopra una prenotazione, se c'è. */
async function matchOf(ctx: MutationCtx, bookingId: Id<"bookings">) {
  return await ctx.db
    .query("openMatches")
    .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
    .first();
}

/** Riallinea i posti liberi delle due partite dopo un'unione o una divisione. */
async function syncBothMatches(
  ctx: MutationCtx,
  first: Id<"bookings">,
  second: Id<"bookings">,
) {
  for (const bookingId of [first, second]) {
    const match = await matchOf(ctx, bookingId);
    if (match) await syncMatchStatus(ctx, match._id);
  }
}

function assertMergeable(booking: Doc<"bookings"> | null, label: string) {
  if (!booking) {
    throw new Error(`${label} non esiste più.`);
  }

  if (booking.status === "cancelled") {
    throw new Error(`${label} è stata annullata.`);
  }

  if (booking.mergedWith) {
    throw new Error(`${label} condivide già il campo con un altro gruppo.`);
  }
}

export const merge = mutation({
  args: {
    secret: v.string(),
    /** Tiene il campo: di solito chi ha prenotato per primo. */
    keepId: v.id("bookings"),
    /** Cede il campo e si sposta su quello dell'altra. */
    moveId: v.id("bookings"),
  },
  handler: async (ctx, { secret, keepId, moveId }) => {
    assertServer(secret);

    if (keepId === moveId) {
      throw new Error("Servono due prenotazioni diverse.");
    }

    const keep = await ctx.db.get(keepId);
    const move = await ctx.db.get(moveId);

    assertMergeable(keep, "La prima prenotazione");
    assertMergeable(move, "La seconda prenotazione");
    if (!keep || !move) return;

    if (keep.bookingDate !== move.bookingDate) {
      throw new Error(
        "Si uniscono solo prenotazioni con lo stesso giorno e la stessa ora.",
      );
    }

    if (keep.bookingDate <= Date.now()) {
      throw new Error("L'orario è già passato.");
    }

    if (keep.slot === move.slot) {
      throw new Error("Le due prenotazioni sono già sullo stesso campo.");
    }

    const players = keep.players.length + move.players.length;
    if (players > MAX_PLAYERS) {
      throw new Error(
        `In campo si sta in ${MAX_PLAYERS}: insieme questi due gruppi sono ${players}.`,
      );
    }

    await ctx.db.patch(moveId, { slot: keep.slot, mergedWith: keepId });
    await ctx.db.patch(keepId, { mergedWith: moveId });

    // Il campo liberato deve tornare disponibile anche su SumUp, che legge il
    // calendario condiviso: due eventi sulla stessa ora valgono due campi.
    await ctx.scheduler.runAfter(
      0,
      internal.modules.courtCalendar.push.remove,
      { bookingId: moveId },
    );

    // I posti ora sono quattro in due: le partite si chiudono, così dall'app
    // nessuno può unirsi a un campo che è già pieno.
    await syncBothMatches(ctx, keepId, moveId);

    // Una mail per gruppo: è la risposta alla promessa fatta al momento della
    // prenotazione, «ai giocatori mancanti ci pensiamo noi».
    for (const bookingId of [keepId, moveId]) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.bookingMail.default,
        { bookingId, kind: "merged" },
      );
    }

    return { players };
  },
});

/**
 * Rimette le due prenotazioni su due campi distinti.
 *
 * Serve un campo libero per quella che si sposta: senza, l'unione non si può
 * sciogliere e va detto invece di lasciare due gruppi accampati sullo stesso
 * campo. Nessuna mail: è una correzione dello staff, e chi ha prenotato non ha
 * mai saputo su quale dei due campi sarebbe finito.
 */
export const split = mutation({
  args: {
    secret: v.string(),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { secret, bookingId }) => {
    assertServer(secret);

    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      throw new Error("Prenotazione non trovata.");
    }

    if (!booking.mergedWith) {
      throw new Error("Questa prenotazione non condivide il campo.");
    }

    const partnerId = booking.mergedWith;
    const partner = await ctx.db.get(partnerId);

    if (!partner) {
      // Il legame punta nel vuoto: si toglie e basta.
      await ctx.db.patch(bookingId, { mergedWith: undefined });
      return { moved: null };
    }

    if (booking.bookingDate <= Date.now()) {
      throw new Error("L'orario è già passato.");
    }

    // Si sposta chi era arrivato dopo: l'altro il campo ce l'aveva già.
    const [stays, moves] =
      booking.createdAt <= partner.createdAt
        ? [booking, partner]
        : [partner, booking];

    const slot = await findAvailableSlot(ctx, moves.bookingDate);
    if (!slot) {
      throw new Error(
        "Non c'è un campo libero a quell'ora: l'unione non si può sciogliere.",
      );
    }

    await ctx.db.patch(moves._id, { slot: slot._id, mergedWith: undefined });
    await ctx.db.patch(stays._id, { mergedWith: undefined });

    // Torna a occupare un campo suo anche sul calendario condiviso.
    await ctx.scheduler.runAfter(
      0,
      internal.modules.courtCalendar.push.default,
      { bookingId: moves._id },
    );

    await syncBothMatches(ctx, stays._id, moves._id);

    return { moved: slot.name };
  },
});
