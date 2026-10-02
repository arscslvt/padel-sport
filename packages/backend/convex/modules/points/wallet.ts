import { query } from "../../_generated/server";
import { getIdentityPlayer } from "../openMatches/lib";
import {
  activeRewards,
  balanceOf,
  pendingTransactions,
  recentTransactions,
  redemptionState,
  rewardImageUrl,
} from "./lib";
import { POINTS_TERMS_VERSION, programState } from "./terms";

/**
 * Il portafoglio di chi sta guardando: saldo, premi, prossimo traguardo.
 *
 * Una query pubblica, ma che legge solo i dati di chi è autenticato: l'identità
 * la dà Clerk, e nessun argomento permette di chiedere il conto di un altro.
 *
 * `null` per chi non è autenticato o non ha una scheda: la pagina distingue i
 * due casi da sé, e un'eccezione la costringerebbe a indovinare.
 */

const HISTORY_LIMIT = 12;

export default query({
  handler: async (ctx) => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return null;

    const balance = balanceOf(player);
    const now = Date.now();

    const rewards = await Promise.all(
      (await activeRewards(ctx)).map(async (reward) => ({
        id: reward._id,
        title: reward.title,
        description: reward.description,
        cost: reward.cost,
        terms: reward.terms,
        validityDays: reward.validityDays,
        imageUrl: await rewardImageUrl(ctx, reward),
        unlocked: balance >= reward.cost,
      })),
    );

    // Il traguardo più vicino è il premio meno caro che ancora non si può
    // prendere. Se si possono prendere tutti, non c'è un prossimo.
    const next = rewards.find((reward) => !reward.unlocked) ?? null;

    const transactions = await recentTransactions(ctx, player._id, HISTORY_LIMIT);

    const redemptions = await ctx.db
      .query("rewardRedemptions")
      .withIndex("by_player", (q) => q.eq("playerId", player._id))
      .order("desc")
      .take(HISTORY_LIMIT);

    const pending = await pendingTransactions(ctx, player._id);

    return {
      /** Punti caricati dallo staff che arrivano aderendo al programma. */
      pendingPoints: pending.reduce((sum, row) => sum + row.delta, 0),
      /** Stato dell'adesione e regolamento da accettare: senza, la pagina chiede di aderire. */
      program: {
        state: programState(player),
        version: POINTS_TERMS_VERSION,
      },
      firstName: player.firstName ?? player.name.split(" ")[0],
      balance,
      next: next
        ? {
            id: next.id,
            title: next.title,
            cost: next.cost,
            missing: next.cost - balance,
          }
        : null,
      rewards,
      transactions: transactions.map((row) => ({
        id: row._id,
        delta: row.delta,
        label: row.label,
        pending: Boolean(row.pending),
        createdAt: row.createdAt,
      })),
      redemptions: redemptions.map((row) => ({
        id: row._id,
        title: row.title,
        code: row.code,
        terms: row.terms,
        state: redemptionState(row, now),
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
      })),
    };
  },
});
