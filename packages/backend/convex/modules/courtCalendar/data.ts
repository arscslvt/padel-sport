import { v } from "convex/values";

import { internalMutation, internalQuery } from "../../_generated/server";
import { MATCH_DURATION_MS } from "../openMatches/lib";
import { SYNC_WINDOW_DAYS } from "./lib";

/**
 * Le letture e le scritture della sincronizzazione.
 *
 * Stanno separate dalle azioni perché quelle girano in Node (servono la
 * libreria di Google e `fetch`), e un file `"use node"` può esportare soltanto
 * azioni.
 */

const blockValidator = v.object({
  externalId: v.string(),
  start: v.number(),
  end: v.number(),
  title: v.optional(v.string()),
  allDay: v.boolean(),
});

/**
 * Rispecchia la finestra sincronizzata: aggiorna quello che c'è, aggiunge
 * quello che manca, cancella quello che sul calendario non esiste più.
 *
 * La finestra è l'unità di verità, non il singolo evento: così una disdetta su
 * SumUp libera lo slot senza bisogno di riceverne notizia esplicita.
 */
export const applyBlocks = internalMutation({
  args: {
    from: v.number(),
    to: v.number(),
    blocks: v.array(blockValidator),
  },
  handler: async (ctx, { from, to, blocks }) => {
    const seen = new Set(blocks.map((block) => block.externalId));

    // Il margine a sinistra recupera gli eventi cominciati prima della finestra
    // ma ancora in corso: Google li restituisce, quindi vanno riconciliati.
    const margin = SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    const existing = await ctx.db
      .query("externalBookings")
      .withIndex("by_start", (q) => q.gte("start", from - margin).lte("start", to))
      .collect();

    const byExternalId = new Map(existing.map((row) => [row.externalId, row]));

    for (const block of blocks) {
      const current = byExternalId.get(block.externalId);

      if (current) {
        await ctx.db.patch(current._id, {
          start: block.start,
          end: block.end,
          title: block.title,
          allDay: block.allDay,
          syncedAt: Date.now(),
        });
        continue;
      }

      await ctx.db.insert("externalBookings", {
        source: "sumup",
        externalId: block.externalId,
        start: block.start,
        end: block.end,
        title: block.title,
        allDay: block.allDay,
        syncedAt: Date.now(),
      });
    }

    // Sparito dal calendario, sparito da qui — ma solo dentro la finestra
    // appena letta, che è l'unica di cui sappiamo qualcosa.
    const removed = existing.filter(
      (row) => row.end > from && !seen.has(row.externalId),
    );

    for (const row of removed) {
      await ctx.db.delete(row._id);
    }

    // Il passato non blocca più niente: teniamo la tabella corta.
    const stale = await ctx.db
      .query("externalBookings")
      .withIndex("by_start", (q) => q.lt("start", from - margin))
      .collect();

    for (const row of stale) {
      await ctx.db.delete(row._id);
    }

    return { synced: blocks.length, removed: removed.length };
  },
});

/** Quando è andata a buon fine l'ultima sincronizzazione. */
export const lastSync = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("externalBookings").collect();

    return rows.reduce((latest, row) => Math.max(latest, row.syncedAt), 0);
  },
});

/** Quel che serve per scrivere una prenotazione sul calendario condiviso. */
export const bookingForCalendar = internalQuery({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) return null;

    const slot = await ctx.db.get(booking.slot);

    return {
      start: booking.bookingDate,
      end: booking.bookingDate + MATCH_DURATION_MS,
      court: slot?.name,
      code: booking.code,
      bookedBy: booking.bookedBy,
      status: booking.status,
      externalEventId: booking.externalEventId,
    };
  },
});

export const attachEvent = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    eventId: v.optional(v.string()),
  },
  handler: async (ctx, { bookingId, eventId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) return;

    await ctx.db.patch(bookingId, { externalEventId: eventId });
  },
});
