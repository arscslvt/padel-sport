import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import { DEFAULT_PRESETS, MAX_DELTA } from "./lib";

/**
 * Le causali pronte per caricare punti. Solo staff, dal segreto condiviso:
 * chi conosce l'URL del deployment non deve poter inventarsi un «+1000».
 */

function assertPoints(points: number) {
  if (!Number.isInteger(points) || points === 0) {
    throw new Error("I punti devono essere un numero intero diverso da zero.");
  }
  if (Math.abs(points) > MAX_DELTA) {
    throw new Error(`Un preset non può superare ${MAX_DELTA} punti.`);
  }
}

export const list = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertServer(secret);

    const rows = await ctx.db
      .query("pointPresets")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .collect();

    return rows
      .sort((a, b) => b.points - a.points || a.label.localeCompare(b.label))
      .map((row) => ({ id: row._id, label: row.label, points: row.points }));
  },
});

/**
 * Semina i preset di partenza, una volta sola.
 *
 * La condizione è «tabella vuota», archiviati compresi: se lo staff ha tolto
 * «Partita vinta» è una scelta, e ritrovarselo la volta dopo sarebbe un
 * dispetto.
 */
export const ensureDefaults = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertServer(secret);

    if (await ctx.db.query("pointPresets").first()) return { seeded: false };

    const now = Date.now();
    for (const preset of DEFAULT_PRESETS) {
      await ctx.db.insert("pointPresets", {
        label: preset.label,
        points: preset.points,
        archived: false,
        createdAt: now,
      });
    }

    return { seeded: true };
  },
});

export const save = mutation({
  args: {
    secret: v.string(),
    presetId: v.optional(v.id("pointPresets")),
    label: v.string(),
    points: v.float64(),
  },
  handler: async (ctx, { secret, presetId, label, points }) => {
    assertServer(secret);
    assertPoints(points);

    const clean = label.trim();
    if (clean.length < 2) throw new Error("Dai un nome al preset.");

    if (presetId) {
      const preset = await ctx.db.get(presetId);
      if (!preset || preset.archived) throw new Error("Preset non trovato.");

      await ctx.db.patch(presetId, { label: clean, points });
      return presetId;
    }

    return await ctx.db.insert("pointPresets", {
      label: clean,
      points,
      archived: false,
      createdAt: Date.now(),
    });
  },
});

export const archive = mutation({
  args: { secret: v.string(), presetId: v.id("pointPresets") },
  handler: async (ctx, { secret, presetId }) => {
    assertServer(secret);
    await ctx.db.patch(presetId, { archived: true });
  },
});
