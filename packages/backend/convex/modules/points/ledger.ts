import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import {
  applyPoints,
  balanceOf,
  pendingTransactions,
  recentTransactions,
  redemptionState,
} from "./lib";
import { programState } from "./terms";

/**
 * Il conto punti di un cliente visto dallo staff: saldo, movimenti, premi
 * riscattati, e il gesto di caricare o togliere.
 */

/** Quanti movimenti mostrare in scheda: lo storico serve a rispondere, non a contabilizzare. */
const HISTORY_LIMIT = 30;

export const detail = query({
  args: { secret: v.string(), playerId: v.id("players") },
  handler: async (ctx, { secret, playerId }) => {
    assertServer(secret);

    const player = await ctx.db.get(playerId);
    if (!player) return null;

    const transactions = await recentTransactions(ctx, playerId, HISTORY_LIMIT);

    const redemptions = await ctx.db
      .query("rewardRedemptions")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .order("desc")
      .take(HISTORY_LIMIT);

    const now = Date.now();

    const pending = await pendingTransactions(ctx, playerId);

    return {
      /** Punti caricati ma non ancora accreditati: aspettano l'adesione. */
      pendingPoints: pending.reduce((sum, row) => sum + row.delta, 0),
      program: {
        state: programState(player),
        acceptedAt: player.pointsProgram?.acceptedAt,
        via: player.pointsProgram?.via,
      },
      balance: balanceOf(player),
      transactions: transactions.map((row) => ({
        id: row._id,
        delta: row.delta,
        label: row.label,
        note: row.note,
        balanceAfter: row.balanceAfter,
        pending: Boolean(row.pending),
        isRedemption: Boolean(row.redemptionId),
        createdAt: row.createdAt,
      })),
      redemptions: redemptions.map((row) => ({
        id: row._id,
        title: row.title,
        cost: row.cost,
        code: row.code,
        state: redemptionState(row, now),
        expiresAt: row.expiresAt,
        usedAt: row.usedAt,
        createdAt: row.createdAt,
      })),
    };
  },
});

/**
 * Carica o toglie punti, da preset o a mano.
 *
 * Con un preset i punti e la causale li decide il preset — il client manda solo
 * quale — così un preset «+3» non diventa «+30» per un errore nel modulo.
 */
export const adjust = mutation({
  args: {
    secret: v.string(),
    playerId: v.id("players"),
    presetId: v.optional(v.id("pointPresets")),
    delta: v.optional(v.float64()),
    label: v.optional(v.string()),
    note: v.optional(v.string()),
    createdByClerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    if (args.presetId) {
      const preset = await ctx.db.get(args.presetId);
      if (!preset || preset.archived) throw new Error("Preset non trovato.");

      return await applyPoints(ctx, {
        playerId: args.playerId,
        delta: preset.points,
        label: preset.label,
        note: args.note,
        presetId: preset._id,
        createdByClerkUserId: args.createdByClerkUserId,
      });
    }

    const label = args.label?.trim();
    if (!label || label.length < 2) {
      throw new Error("Scrivi il motivo del movimento.");
    }
    if (args.delta === undefined) throw new Error("Indica quanti punti.");

    return await applyPoints(ctx, {
      playerId: args.playerId,
      delta: args.delta,
      label,
      note: args.note,
      createdByClerkUserId: args.createdByClerkUserId,
    });
  },
});

/**
 * Annulla un movimento in attesa caricato per sbaglio.
 *
 * Solo quelli in attesa: non sono ancora del cliente, non li ha visti, e
 * cancellarli non lascia buchi nel saldo. Un movimento accreditato si corregge
 * con un movimento opposto, che resta nel registro.
 */
export const removePending = mutation({
  args: {
    secret: v.string(),
    transactionId: v.id("pointTransactions"),
  },
  handler: async (ctx, { secret, transactionId }) => {
    assertServer(secret);

    const transaction = await ctx.db.get(transactionId);
    if (!transaction) throw new Error("Movimento non trovato.");
    if (!transaction.pending) {
      throw new Error(
        "Questo movimento è già stato accreditato: correggilo con un movimento opposto.",
      );
    }

    await ctx.db.delete(transactionId);
  },
});
