import { v } from "convex/values";

import { internalMutation } from "../../../_generated/server";
import { posterSpec, socialFormat, socialPostKind } from "../lib";

/** Gli accessi al database dei template, separati perché il generatore gira in Node. */
export const insertMany = internalMutation({
  args: {
    kind: socialPostKind,
    situation: v.string(),
    formats: v.array(socialFormat),
    variants: v.array(
      v.object({
        caption: v.string(),
        hashtags: v.array(v.string()),
        poster: posterSpec,
      }),
    ),
    model: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
  },
  handler: async (ctx, { kind, situation, formats, variants, ...meta }) => {
    const now = Date.now();

    for (const variant of variants) {
      await ctx.db.insert("socialTemplates", {
        kind,
        situation,
        formats,
        ...variant,
        ...meta,
        status: "pending_review",
        usageCount: 0,
        createdAt: now,
      });
    }

    return variants.length;
  },
});
