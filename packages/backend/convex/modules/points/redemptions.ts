import { v } from "convex/values";

import { clubMutation, serverMutation, serverQuery } from "../../functions";
import { displayName } from "../clients/lib";
import { requirePlayer } from "../openMatches/lib";
import {
  applyPoints,
  assertPointsUnfrozen,
  balanceOf,
  generateRedemptionCode,
  redemptionExpiry,
  redemptionState,
  rewardImageUrl,
} from "./lib";
import { programState } from "./terms";

/**
 * Riscattare un premio, consegnarlo, annullarlo.
 *
 * Il riscatto lo fa il cliente dal sito: i punti sono suoi, e la scelta di
 * spenderli anche. Da lì riceve un codice, che allo sportello lo staff cerca
 * qui e segna come consegnato.
 */

/** Il cliente spende i propri punti per un premio. */
export const redeem = clubMutation({
  args: { rewardId: v.id("rewards") },
  handler: async (ctx, { rewardId }) => {
    const player = await requirePlayer(ctx, ctx.club._id);
    assertPointsUnfrozen(player);

    // Chi sta uscendo riscatta ancora: ha dieci giorni per farlo.
    const state = programState(player);
    if (state === "left") {
      throw new Error(
        "Sei uscito dal programma punti. Per riscattare aderisci di nuovo.",
      );
    }
    if (state !== "joined" && state !== "leaving") {
      throw new Error("Accetta il regolamento del programma punti per riscattare.");
    }

    const reward = await ctx.db.get(rewardId);
    if (!reward || reward.archived) {
      throw new Error("Questo premio non è più disponibile.");
    }
    if (reward.disabled) {
      throw new Error("Questo premio al momento non è disponibile.");
    }

    const balance = balanceOf(player);
    if (balance < reward.cost) {
      throw new Error(
        `Ti mancano ${reward.cost - balance} punti per questo premio.`,
      );
    }

    const now = Date.now();

    const redemptionId = await ctx.db.insert("rewardRedemptions", {
      clubId: ctx.club._id,
      playerId: player._id,
      rewardId,
      title: reward.title,
      cost: reward.cost,
      terms: reward.terms,
      code: await generateRedemptionCode(ctx),
      status: "active",
      expiresAt: redemptionExpiry(reward.validityDays, now),
      createdAt: now,
    });

    const { balance: remaining } = await applyPoints(ctx, {
      playerId: player._id,
      delta: -reward.cost,
      label: `Premio riscattato: ${reward.title}`,
      redemptionId,
    });

    const redemption = await ctx.db.get(redemptionId);

    return { code: redemption?.code, balance: remaining };
  },
});

/** I premi riscattati e non ancora consegnati: la lista dello sportello. */
export const pending = serverQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("rewardRedemptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const now = Date.now();

    return await Promise.all(
      rows
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (row) => {
          const player = await ctx.db.get(row.playerId);
          // La foto del premio: allo sportello si riconosce l'oggetto da
          // consegnare prima ancora di leggerne il nome.
          const reward = await ctx.db.get(row.rewardId);

          return {
            id: row._id,
            playerId: row.playerId,
            playerName: player ? displayName(player) : "Cliente rimosso",
            imageUrl: reward ? await rewardImageUrl(ctx, reward) : null,
            title: row.title,
            cost: row.cost,
            code: row.code,
            state: redemptionState(row, now),
            expiresAt: row.expiresAt,
            createdAt: row.createdAt,
          };
        }),
    );
  },
});

/** Premio consegnato. Una volta sola: segnarlo due volte non ne fa due. */
export const markUsed = serverMutation({
  args: { redemptionId: v.id("rewardRedemptions") },
  handler: async (ctx, { redemptionId }) => {
    const redemption = await ctx.db.get(redemptionId);
    if (!redemption) throw new Error("Riscatto non trovato.");

    const state = redemptionState(redemption);
    if (state === "used") throw new Error("Questo premio è già stato consegnato.");
    if (state === "cancelled") throw new Error("Questo riscatto è stato annullato.");
    if (state === "expired") {
      throw new Error("Questo premio è scaduto: annullalo per restituire i punti.");
    }

    await ctx.db.patch(redemptionId, { status: "used", usedAt: Date.now() });
  },
});

/**
 * Annulla un riscatto e restituisce i punti.
 *
 * Serve quando il premio non c'è più, o quando è scaduto e il club decide di
 * ridare i punti: è un movimento nuovo e non la cancellazione del vecchio,
 * così nel registro si legge sia la spesa sia la restituzione.
 */
export const cancel = serverMutation({
  args: {
    redemptionId: v.id("rewardRedemptions"),
    createdByClerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, { redemptionId, createdByClerkUserId }) => {
    const redemption = await ctx.db.get(redemptionId);
    if (!redemption) throw new Error("Riscatto non trovato.");
    if (redemption.status !== "active") {
      throw new Error("Si annulla solo un premio non ancora consegnato.");
    }

    await ctx.db.patch(redemptionId, { status: "cancelled" });

    await applyPoints(ctx, {
      playerId: redemption.playerId,
      delta: redemption.cost,
      label: `Riscatto annullato: ${redemption.title}`,
      redemptionId,
      createdByClerkUserId,
    });
  },
});
