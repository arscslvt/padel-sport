import { v } from "convex/values";

import { serverMutation, serverQuery } from "../../functions";
import { reconcileFirstMatch } from "./auto";
import {
  applyPoints,
  balanceOf,
  exitDeadline,
  pendingTransactions,
  recentTransactions,
  redemptionState,
} from "./lib";
import { FIRST_MATCH_NEWCOMERS_SINCE } from "./rules";
import { programState } from "./terms";

/**
 * Il conto punti di un cliente visto dallo staff: saldo, movimenti, premi
 * riscattati, e il gesto di caricare o togliere.
 */

/** Quanti movimenti mostrare in scheda: lo storico serve a rispondere, non a contabilizzare. */
const HISTORY_LIMIT = 30;

export const detail = serverQuery({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
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
    const exit = player.pointsProgram?.exit;

    // La richiesta di uscita ancora aperta: lo staff deve sapere che la mail
    // è partita, e fino a quando il link vale.
    const exitRequest = (
      await ctx.db
        .query("pointsExitRequests")
        .withIndex("by_player", (q) => q.eq("playerId", playerId))
        .collect()
    )
      .filter((row) => row.status === "pending" && row.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    return {
      /** Punti caricati ma non ancora accreditati: aspettano l'adesione. */
      pendingPoints: pending.reduce((sum, row) => sum + row.delta, 0),
      program: {
        state: programState(player, now),
        acceptedAt: player.pointsProgram?.acceptedAt,
        via: player.pointsProgram?.via,
        exit: exit
          ? {
              requestedAt: exit.requestedAt,
              deadline: exitDeadline(exit),
              via: exit.via,
            }
          : undefined,
        exitRequest: exitRequest
          ? {
              email: exitRequest.email,
              sentAt: exitRequest.createdAt,
              expiresAt: exitRequest.expiresAt,
            }
          : undefined,
      },
      balance: balanceOf(player),
      /** Account sospeso: i punti sono congelati (lib.ts). */
      frozen: Boolean(player.suspension),
      /**
       * Solo le schede nate dopo il portale possono essere di clienti nuovi:
       * per quelle lo staff dice se la persona era già cliente.
       */
      firstMatch:
        player.createdAt >= FIRST_MATCH_NEWCOMERS_SINCE
          ? { existingClient: Boolean(player.existingClient) }
          : null,
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
export const adjust = serverMutation({
  args: {
    playerId: v.id("players"),
    presetId: v.optional(v.id("pointPresets")),
    delta: v.optional(v.float64()),
    label: v.optional(v.string()),
    note: v.optional(v.string()),
    createdByClerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
 * Segna se la persona era già cliente prima di avere la scheda.
 *
 * Tolta la spunta, «Prima partita» si rivaluta subito: se ha già una
 * prenotazione confermata il premio arriva adesso. Messa la spunta, il premio
 * già dato resta — come per le schede vecchie (auto.ts): se va tolto, lo
 * staff lo fa con un movimento a mano, scrivendo lui il perché.
 */
export const setExistingClient = serverMutation({
  args: {
    playerId: v.id("players"),
    existingClient: v.boolean(),
  },
  handler: async (ctx, { playerId, existingClient }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Cliente non trovato.");

    await ctx.db.patch(playerId, {
      existingClient: existingClient || undefined,
    });
    await reconcileFirstMatch(ctx, playerId);

    const award = (
      await ctx.db
        .query("pointTransactions")
        .withIndex("by_auto_key", (q) =>
          q.eq("autoKey", `first_match:${playerId}`),
        )
        .collect()
    ).find((row) => !row.reversedAt && !row.reversalOf);

    return { awarded: Boolean(award) };
  },
});

/**
 * Annulla un movimento in attesa caricato per sbaglio.
 *
 * Solo quelli in attesa: non sono ancora del cliente, non li ha visti, e
 * cancellarli non lascia buchi nel saldo. Un movimento accreditato si corregge
 * con un movimento opposto, che resta nel registro.
 */
export const removePending = serverMutation({
  args: {
    transactionId: v.id("pointTransactions"),
  },
  handler: async (ctx, { transactionId }) => {
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
