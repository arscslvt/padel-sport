import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import { activeRewards, rewardImageUrl } from "./lib";

/**
 * Il catalogo premi, lato staff. Il cliente lo legge da `wallet.ts`, che
 * espone solo quello che serve a una vetrina.
 */

function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const list = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertServer(secret);

    const rewards = await activeRewards(ctx);

    const redemptions = await ctx.db
      .query("rewardRedemptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return await Promise.all(
      rewards.map(async (reward) => ({
        id: reward._id,
        title: reward.title,
        description: reward.description,
        cost: reward.cost,
        terms: reward.terms,
        validityDays: reward.validityDays,
        imageUrl: await rewardImageUrl(ctx, reward),
        hasImage: Boolean(reward.imageStorageId),
        /** Riscattati e non ancora consegnati: quanti ne deve avere pronti il club. */
        pending: redemptions.filter((row) => row.rewardId === reward._id)
          .length,
      })),
    );
  },
});

/**
 * L'indirizzo a cui il browser dello staff carica la foto.
 *
 * Il file va dritto a Convex e non passa dal sito: una route Next che fa da
 * tramite a un'immagine di qualche mega sbatterebbe contro il limite del corpo
 * delle funzioni di Vercel. L'URL scade dopo un'ora e vale per un solo file.
 */
export const uploadUrl = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertServer(secret);
    return await ctx.storage.generateUploadUrl();
  },
});

export const save = mutation({
  args: {
    secret: v.string(),
    rewardId: v.optional(v.id("rewards")),
    title: v.string(),
    description: v.string(),
    cost: v.float64(),
    terms: v.optional(v.string()),
    validityDays: v.optional(v.float64()),
    /** Una foto nuova; assente lascia quella che c'è. */
    imageStorageId: v.optional(v.id("_storage")),
    removeImage: v.optional(v.boolean()),
  },
  handler: async (ctx, { secret, rewardId, ...fields }) => {
    assertServer(secret);

    const title = fields.title.trim();
    const description = fields.description.trim();

    if (title.length < 2) throw new Error("Dai un titolo al premio.");
    if (description.length < 2) throw new Error("Descrivi il premio.");
    if (!Number.isInteger(fields.cost) || fields.cost < 1) {
      throw new Error("Il premio deve costare almeno un punto, in numeri interi.");
    }
    if (
      fields.validityDays !== undefined &&
      (!Number.isInteger(fields.validityDays) || fields.validityDays < 1)
    ) {
      throw new Error("La validità è un numero di giorni, almeno uno.");
    }

    const values = {
      title,
      description,
      cost: fields.cost,
      terms: cleanText(fields.terms),
      validityDays: fields.validityDays,
    };

    if (!rewardId) {
      return await ctx.db.insert("rewards", {
        ...values,
        imageStorageId: fields.imageStorageId,
        archived: false,
        createdAt: Date.now(),
      });
    }

    const reward = await ctx.db.get(rewardId);
    if (!reward || reward.archived) throw new Error("Premio non trovato.");

    const replacing = fields.imageStorageId || fields.removeImage;

    // La foto vecchia non serve più a nessuno: i riscatti copiano titolo e
    // termini, non l'immagine.
    if (replacing && reward.imageStorageId) {
      await ctx.storage.delete(reward.imageStorageId);
    }

    await ctx.db.patch(rewardId, {
      ...values,
      imageStorageId: replacing ? fields.imageStorageId : reward.imageStorageId,
    });

    return rewardId;
  },
});

/** Toglie il premio dalla vetrina. Chi l'ha già riscattato lo tiene. */
export const archive = mutation({
  args: { secret: v.string(), rewardId: v.id("rewards") },
  handler: async (ctx, { secret, rewardId }) => {
    assertServer(secret);
    await ctx.db.patch(rewardId, { archived: true });
  },
});
