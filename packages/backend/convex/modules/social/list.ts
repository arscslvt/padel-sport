import { v } from "convex/values";

import { query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import { socialPostStatus } from "./lib";

/**
 * L'elenco delle bozze per la dashboard.
 *
 * Passa dal segreto condiviso perché qui dentro c'è il campo `facts`, cioè il
 * testo esatto consegnato al modello, e la firma di chi ha approvato: roba da
 * struttura, non da profilo pubblico. La prima serratura è Clerk, nella route
 * che chiama; questa è la seconda.
 *
 * Un elenco solo e non uno per stato: contenuti automatici e contenuti da
 * approvare condividono la stessa macchina, quindi condividono anche l'archivio.
 * A separarli è un filtro, che è esattamente quanto merita la differenza.
 */
export default query({
  args: {
    secret: v.string(),
    status: v.optional(socialPostStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { secret, status, limit }) => {
    assertServer(secret);

    const rows = await ctx.db
      .query("socialPosts")
      .withIndex("by_created")
      .order("desc")
      .take(Math.min(limit ?? 60, 200));

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }

    const visible = status ? rows.filter((row) => row.status === status) : rows;

    return {
      counts,
      posts: visible.map((row) => ({
        id: row._id,
        kind: row.kind,
        format: row.format,
        channel: row.channel,
        approval: row.approval,
        status: row.status,
        triggerKey: row.triggerKey,
        caption: row.caption,
        hashtags: row.hashtags,
        poster: row.poster,
        posterToken: row.posterToken,
        altText: row.altText,
        linkUrl: row.linkUrl,
        /** Il testo dato al modello: è qui che si controlla l'anonimato. */
        facts: row.facts,
        scheduledAt: row.scheduledAt,
        publishedAt: row.publishedAt,
        permalink: row.permalink,
        error: row.error,
        reviewedBy: row.reviewedBy,
        reviewedAt: row.reviewedAt,
        createdAt: row.createdAt,
      })),
    };
  },
});
