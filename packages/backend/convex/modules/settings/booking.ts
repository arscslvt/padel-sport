import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import { bookingSettings, DEFAULT_SETTINGS } from "./lib";

/**
 * Configurazione della prenotazione: quando si apre e con quali campi.
 *
 * La lettura è pubblica — sono gli orari di apertura, li deve vedere chi
 * prenota. La scrittura passa da un segreto condiviso con il sito, perché
 * Convex non sa chi è lo staff: quello lo sa Clerk, e il controllo vero sta
 * nella route che la chiama (app/api/dashboard/booking-settings). Due guardie
 * in fila, come per l'elenco degli iscritti agli eventi.
 */

const windowValidator = v.object({
  weekday: v.number(),
  start: v.string(),
  end: v.string(),
});

const TIME_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;

function assertServer(secret: string) {
  const expected = process.env.BOOKING_WEBHOOK_SECRET;

  if (!expected || secret !== expected) {
    throw new Error("Operazione non consentita.");
  }
}

export const get = query({
  args: {},
  handler: async (ctx) => await bookingSettings(ctx),
});

/** I campi, anche quelli spenti: la dashboard deve poterli riaccendere. */
export const courts = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("slots").collect();

    return rows
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((slot) => ({
        id: slot._id,
        name: slot.name,
        description: slot.description,
        active: slot.active,
      }));
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    windows: v.array(windowValidator),
    bookableDays: v.number(),
  },
  handler: async (ctx, { secret, windows, bookableDays }) => {
    assertServer(secret);

    if (bookableDays < 1 || bookableDays > 60) {
      throw new Error("I giorni prenotabili devono stare fra 1 e 60.");
    }

    for (const window of windows) {
      if (window.weekday < 0 || window.weekday > 6) {
        throw new Error("Giorno della settimana non valido.");
      }

      if (!TIME_PATTERN.test(window.start) || !TIME_PATTERN.test(window.end)) {
        throw new Error(
          "Gli orari vanno indicati a scaglioni di 30 minuti, da 00:00 a 23:30.",
        );
      }

      if (window.start >= window.end) {
        throw new Error("L'apertura deve precedere la chiusura.");
      }
    }

    const existing = await ctx.db.query("bookingSettings").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        windows,
        bookableDays,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("bookingSettings", {
      windows,
      bookableDays,
      updatedAt: Date.now(),
    });
  },
});

/** Ripristina gli orari storici del club. */
export const reset = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertServer(secret);

    const existing = await ctx.db.query("bookingSettings").first();
    if (existing) await ctx.db.delete(existing._id);

    return DEFAULT_SETTINGS;
  },
});

export const saveCourt = mutation({
  args: {
    secret: v.string(),
    courtId: v.optional(v.id("slots")),
    name: v.string(),
    description: v.optional(v.string()),
    active: v.boolean(),
  },
  handler: async (ctx, { secret, courtId, name, description, active }) => {
    assertServer(secret);

    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      throw new Error("Il nome del campo deve avere fra 2 e 40 caratteri.");
    }

    if (courtId) {
      await ctx.db.patch(courtId, { name: trimmed, description, active });
      return courtId;
    }

    // Il nome distingue i campi anche nel calendario e nelle mail: due uguali
    // renderebbero illeggibile ogni prenotazione.
    const taken = await ctx.db
      .query("slots")
      .withIndex("by_name", (q) => q.eq("name", trimmed))
      .first();

    if (taken) {
      throw new Error("Esiste già un campo con questo nome.");
    }

    return await ctx.db.insert("slots", {
      name: trimmed,
      description,
      active,
    });
  },
});
