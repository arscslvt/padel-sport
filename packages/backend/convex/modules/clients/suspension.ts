import { v } from "convex/values";

import type { Doc } from "../../_generated/dataModel";
import { type MutationCtx, mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import { balanceOf, isRedemptionUsable } from "../points/lib";

/**
 * Sospensione dell'account di un cliente, e la sua riattivazione.
 *
 * Qui sta solo la metà che riguarda il club: il motivo, chi l'ha decisa, i
 * punti che si fermano. L'altra metà — chiudere davvero la porta — la fa Clerk
 * su richiesta della route (api/dashboard/clients/[playerId]/suspension), che
 * poi scrive al cliente con quello che le due mutation le restituiscono.
 */

/** Sotto i dieci caratteri non è un motivo, è un'etichetta: il cliente lo legge. */
const REASON_MIN = 10;
const REASON_MAX = 1000;

/** Quel che serve alla mail: a chi scrivere, e cosa dirgli dei suoi punti. */
async function mailFacts(ctx: MutationCtx, player: Doc<"players">) {
  const now = Date.now();

  // I premi già riscattati e non ancora ritirati: la mail gli ricorda che
  // restano suoi e che può passare a prenderli.
  const redemptions = (
    await ctx.db
      .query("rewardRedemptions")
      .withIndex("by_player", (q) => q.eq("playerId", player._id))
      .collect()
  )
    .filter((row) => isRedemptionUsable(row, now))
    .map((row) => ({
      title: row.title,
      code: row.code,
      expiresAt: row.expiresAt,
    }));

  return {
    firstName: player.firstName ?? player.name.split(" ")[0],
    email: player.email,
    clerkUserId: player.clerkUserId,
    points: balanceOf(player),
    redemptions,
  };
}

export const suspend = mutation({
  args: {
    secret: v.string(),
    playerId: v.id("players"),
    reason: v.string(),
    suspendedByClerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, { secret, playerId, reason, suspendedByClerkUserId }) => {
    assertServer(secret);

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Cliente non trovato.");

    if (!player.clerkUserId) {
      throw new Error("Questa scheda non ha un account da sospendere.");
    }

    if (player.suspension) {
      throw new Error("L'account è già sospeso.");
    }

    const text = reason.trim();
    if (text.length < REASON_MIN) {
      throw new Error(
        "Scrivi il motivo della sospensione: il cliente lo leggerà nella mail.",
      );
    }
    if (text.length > REASON_MAX) {
      throw new Error(`Il motivo non può superare ${REASON_MAX} caratteri.`);
    }

    await ctx.db.patch(playerId, {
      suspension: {
        reason: text,
        suspendedAt: Date.now(),
        suspendedByClerkUserId,
      },
    });

    return { ...(await mailFacts(ctx, player)), reason: text };
  },
});

export const reactivate = mutation({
  args: { secret: v.string(), playerId: v.id("players") },
  handler: async (ctx, { secret, playerId }) => {
    assertServer(secret);

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Cliente non trovato.");

    if (!player.suspension) {
      throw new Error("L'account non è sospeso.");
    }

    await ctx.db.patch(playerId, { suspension: undefined });

    return await mailFacts(ctx, player);
  },
});

/**
 * Rimette la sospensione com'era. La usa solo la route, quando Clerk non è
 * riuscito a riaprire l'accesso: meglio un account sospeso per davvero che uno
 * che il club crede attivo e che invece non entra.
 */
export const restore = mutation({
  args: {
    secret: v.string(),
    playerId: v.id("players"),
    suspension: v.object({
      reason: v.string(),
      suspendedAt: v.float64(),
      suspendedByClerkUserId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { secret, playerId, suspension }) => {
    assertServer(secret);
    await ctx.db.patch(playerId, { suspension });
  },
});
