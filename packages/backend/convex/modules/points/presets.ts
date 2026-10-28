import { v } from "convex/values";

import { serverMutation, serverQuery } from "../../functions";
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

export const list = serverQuery({
  args: {},
  handler: async (ctx) => {
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
export const ensureDefaults = serverMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("pointPresets").first()) return { seeded: false };

    const now = Date.now();
    for (const preset of DEFAULT_PRESETS) {
      await ctx.db.insert("pointPresets", {
        clubId: ctx.club._id,
        label: preset.label,
        points: preset.points,
        archived: false,
        createdAt: now,
      });
    }

    return { seeded: true };
  },
});

export const save = serverMutation({
  args: {
    presetId: v.optional(v.id("pointPresets")),
    label: v.string(),
    points: v.float64(),
  },
  handler: async (ctx, { presetId, label, points }) => {
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
      clubId: ctx.club._id,
      label: clean,
      points,
      archived: false,
      createdAt: Date.now(),
    });
  },
});

export const archive = serverMutation({
  args: { presetId: v.id("pointPresets") },
  handler: async (ctx, { presetId }) => {
    await ctx.db.patch(presetId, { archived: true });
  },
});
