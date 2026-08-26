import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { claimRow } from "./data";
import { formatsFor, socialPostKind } from "./lib";

/**
 * L'unica porta da cui entra un contenuto.
 *
 * Tutti e sei i punti di aggancio — la partita di torneo che finisce, la
 * prenotazione aperta, la richiesta dal sito, l'evento pubblicato, il cron
 * serale, il consiglio a giorni alterni — chiamano questa. Non perché faccia
 * molto, ma perché così la difesa dal doppione e il tetto giornaliero stanno
 * in un punto solo: sei chiamanti che fanno ciascuno la propria `insert`
 * sarebbero sei occasioni di dimenticarsene.
 *
 * Un `kind` può generare più righe. L'annuncio di un evento ne vuole due, un
 * post e una storia, e la scelta di quali formati sia il caso di produrre
 * appartiene a `formatsFor`, non al chiamante: chi aggancia il trigger sa cosa
 * è successo, non come si racconta.
 */
export default internalMutation({
  args: {
    kind: socialPostKind,
    triggerKey: v.string(),
    /** Quando diventa pubblicabile. Assente vuol dire subito. */
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, { kind, triggerKey, scheduledAt }) => {
    const created: string[] = [];

    for (const format of formatsFor(kind)) {
      const postId = await claimRow(ctx, {
        kind,
        format,
        channel: "instagram",
        triggerKey,
        scheduledAt,
      });

      if (!postId) continue;

      // La composizione è un'azione — parla con la rete — quindi non può
      // avvenire qui dentro. Si accoda, come fanno le quattordici scritture
      // che in questo backend rimandano il proprio effetto collaterale.
      await ctx.scheduler.runAfter(0, internal.modules.social.compose.default, {
        postId,
      });

      created.push(postId);
    }

    return created;
  },
});
