import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { membersOf, requireCircleMember } from "../circles/lib";
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
 * (stessa tabella e stessa logica di disponibilità del web) e, a seconda
 * della visibilità, ci costruisce sopra una partita.
 *
 * - `private`: solo la prenotazione, nessuna partita da riempire.
 * - `public`: la partita finisce fra quelle aperte a tutti.
 * - `circle`: la partita è riservata ai membri di `circleId`, che ricevono
 *   tutti un invito. Se non si riempie, il creatore può poi aprirla a tutti
 *   tenendo chi è già entrato (modules/openMatches/publish.ts).
 */
export default mutation({
  args: {
    bookingDate: v.number(),
    levelMin: v.number(),
    levelMax: v.number(),
    visibility: v.union(
      v.literal("private"),
      v.literal("public"),
      v.literal("circle"),
    ),
    circleId: v.optional(v.id("circles")),
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

    if (args.visibility === "public" && !args.joinMode) {
      throw new Error(
        "Scegli come far entrare gli altri giocatori nella partita.",
      );
    }

    if (args.visibility === "circle" && !args.circleId) {
      throw new Error("Scegli la cerchia in cui creare la partita.");
    }

    // Restringe il tipo per il resto dell'handler: da qui in poi `circleId`
    // c'è se e solo se la partita è di cerchia.
    const circleId = args.visibility === "circle" ? args.circleId : undefined;

    // Solo chi è nella cerchia può organizzarci dentro una partita
    let circleMemberIds: Id<"players">[] = [];
    if (circleId) {
      await requireCircleMember(ctx, circleId, player._id);
      circleMemberIds = (await membersOf(ctx, circleId)).map(
        (row) => row.playerId,
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
    if (args.visibility !== "private") {
      matchId = await ctx.db.insert("openMatches", {
        bookingId,
        creatorId: player._id,
        playerIds: [player._id],
        maxPlayers: MAX_PLAYERS,
        matchDate: args.bookingDate,
        levelMin: args.levelMin,
        levelMax: args.levelMax,
        // Nella cerchia si entra senza chiedere: sono già tutti invitati
        joinMode: circleId ? "direct" : (args.joinMode ?? "direct"),
        status: "open",
        visibility: circleId ? "circle" : "public",
        circleId,
        notes,
        createdAt: Date.now(),
      });
    }

    // Ogni membro della cerchia riceve l'invito, tranne chi la sta creando
    if (matchId && circleId) {
      await Promise.all(
        circleMemberIds
          .filter((playerId) => playerId !== player._id)
          .map((playerId) =>
            ctx.db.insert("matchInvites", {
              matchId,
              circleId,
              playerId,
              status: "pending",
              createdAt: Date.now(),
            }),
          ),
      );
    }

    const visibilityNote =
      args.visibility === "public"
        ? " (partita aperta)"
        : args.visibility === "circle"
          ? " (partita di cerchia)"
          : "";

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      {
        title: "Nuova prenotazione dall'app",
        message: `${player.name} ha prenotato per il ${new Date(
          args.bookingDate,
        ).toLocaleString("it-IT")}${visibilityNote}.`,
        tags: ["booking", "new", "mobile"],
      },
    );

    return { bookingId, matchId, code: bookingCode };
  },
});
