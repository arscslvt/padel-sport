import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import {
  findAvailableSlot,
  LEVEL_MAX,
  LEVEL_MIN,
  levelLabel,
  MAX_PLAYERS,
  requirePlayer,
  SLOT_INTERVAL_MS,
} from "./lib";

/**
 * Crea una prenotazione dall'app mobile: occupa un campo reale
 * (stessa tabella e stessa logica di disponibilità del web) e,
 * se `open` è true, pubblica la partita tra quelle aperte.
 */
export default mutation({
  args: {
    bookingDate: v.number(),
    levelMin: v.number(),
    levelMax: v.number(),
    open: v.boolean(),
    joinMode: v.optional(v.union(v.literal("direct"), v.literal("request"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const player = await requirePlayer(ctx);

    if (args.bookingDate <= Date.now()) {
      throw new Error("La data e l'ora devono essere nel futuro.");
    }

    if (args.bookingDate % SLOT_INTERVAL_MS !== 0) {
      throw new Error(
        "L'orario deve essere selezionato a scaglioni di 30 minuti.",
      );
    }

    if (
      args.levelMin < LEVEL_MIN ||
      args.levelMax > LEVEL_MAX ||
      args.levelMin > args.levelMax
    ) {
      throw new Error("Il livello richiesto non è valido.");
    }

    if (args.open && !args.joinMode) {
      throw new Error(
        "Scegli come far entrare gli altri giocatori nella partita.",
      );
    }

    const slot = await findAvailableSlot(ctx, args.bookingDate);
    if (!slot) {
      throw new Error(
        "L'orario selezionato non e disponibile. Scegli uno slot differente.",
      );
    }

    // 6 cifre alfanumeriche casuali per il codice di prenotazione
    const bookingCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const existingCode = await ctx.db
      .query("bookings")
      .withIndex("by_code", (q) => q.eq("code", bookingCode))
      .first();

    if (existingCode) {
      throw new Error("Si è verificato un errore. Riprova a prenotare.");
    }

    const notes = args.notes?.trim() || undefined;

    const bookingId = await ctx.db.insert("bookings", {
      bookedBy: player.name,
      players: [player.name],
      bookingDate: args.bookingDate,
      level: levelLabel(args.levelMin, args.levelMax),
      bookForAll: false,
      slot: slot._id,
      pricePerPlayer: 7,
      paymentMode: "on_site",
      status: "pending_on_site_payment",
      createdAt: Date.now(),
      code: bookingCode,
      createdByPlayer: player._id,
    });

    let matchId = null;
    if (args.open) {
      matchId = await ctx.db.insert("openMatches", {
        bookingId,
        creatorId: player._id,
        playerIds: [player._id],
        maxPlayers: MAX_PLAYERS,
        matchDate: args.bookingDate,
        levelMin: args.levelMin,
        levelMax: args.levelMax,
        joinMode: args.joinMode ?? "direct",
        status: "open",
        notes,
        createdAt: Date.now(),
      });
    }

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      {
        title: "Nuova prenotazione dall'app",
        message: `${player.name} ha prenotato per il ${new Date(
          args.bookingDate,
        ).toLocaleString("it-IT")}${args.open ? " (partita aperta)" : ""}.`,
        tags: ["booking", "new", "mobile"],
      },
    );

    return { bookingId, matchId, code: bookingCode };
  },
});
