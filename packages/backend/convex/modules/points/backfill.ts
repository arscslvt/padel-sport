import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { syncParticipants } from "./auto";
import { POINT_RULES, ruleRow } from "./rules";

/**
 * L'avvio dei punti automatici, da lanciare una volta dopo il deploy:
 *
 *   npx convex run modules/points/backfill:default
 *
 * Riempie `bookingPlayers` con lo storico delle prenotazioni, a blocchi, e
 * **senza dare punti**: chi gioca da anni non deve ricevere oggi la «prima
 * partita». Solo alla fine accende le azioni, con `since` = adesso, così
 * tutto quello che è già successo resta fuori dai premi.
 *
 * Rilanciarla non fa danni: l'indice si riallinea e le azioni già
 * configurate non si toccano.
 */

const BATCH = 200;

export default internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("bookings")
      .paginate({ cursor: cursor ?? null, numItems: BATCH });

    for (const booking of page.page) {
      await syncParticipants(ctx, booking);
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.points.backfill.default,
        { cursor: page.continueCursor },
      );
      return { done: false, processed: page.page.length };
    }

    const now = Date.now();
    for (const rule of POINT_RULES) {
      if (await ruleRow(ctx, rule.key)) continue;
      await ctx.db.insert("pointRules", {
        key: rule.key,
        points: rule.defaultPoints,
        enabled: true,
        since: now,
        updatedAt: now,
      });
    }

    return { done: true, processed: page.page.length };
  },
});
