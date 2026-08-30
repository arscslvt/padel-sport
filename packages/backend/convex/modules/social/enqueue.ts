import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { staffSocialUrl } from "../../utils/staffLinks";
import {
  applyTemplate,
  claimRow,
  factsInputFor,
  markSkipped,
  pickTemplate,
} from "./data";
import { formatsFor, socialPostKind } from "./lib";
import { isTemplated, situationOf, valuesOf } from "./situations";

/**
 * L'unica porta da cui entra un contenuto.
 *
 * Tutti i punti di aggancio chiamano questa: la partita di torneo che finisce,
 * la prenotazione aperta, la richiesta dal sito, l'evento pubblicato, il cron
 * serale. Così la difesa dal doppione e il tetto giornaliero stanno in un punto
 * solo, invece di essere sei occasioni di dimenticarsene.
 *
 * Da qui in poi le strade sono due, e la differenza è tutta nel fatto che una
 * chiama un modello e l'altra no:
 *
 * - **a template** — quasi tutto. Si calcola la situazione, si sceglie fra gli
 *   template già approvati, si riempiono i buchi. Sostituzione di testo dentro
 *   una transazione: niente rete, niente attesa, niente che possa fallire
 *   mentre un risultato aspetta di uscire. E niente dato personale che vada da
 *   qualche parte, perché non c'è nessun «da qualche parte».
 * - **a modello** — solo i consigli tecnici, che ogni volta sono contenuto
 *   nuovo e vengono scritti da capo. Quella è un'azione, e viene accodata.
 */
export default internalMutation({
  args: {
    kind: socialPostKind,
    triggerKey: v.string(),
    /** Su cosa: la partita, la richiesta, il documento dell'evento. */
    subjectId: v.optional(v.string()),
    /** Quando diventa pubblicabile. Assente vuol dire subito. */
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, { kind, triggerKey, subjectId, scheduledAt }) => {
    const created: string[] = [];

    for (const format of formatsFor(kind)) {
      const postId = await claimRow(ctx, {
        kind,
        format,
        channel: "instagram",
        triggerKey,
        subjectId,
        scheduledAt,
      });

      if (!postId) continue;
      created.push(postId);

      if (!isTemplated(kind)) {
        // I consigli passano dal modello: è un'azione, e le azioni non possono
        // girare dentro una mutation.
        await ctx.scheduler.runAfter(
          0,
          internal.modules.social.compose.default,
          { postId },
        );
        continue;
      }

      const row = await ctx.db.get(postId);
      if (!row) continue;

      const facts = await factsInputFor(ctx, row);

      if (!facts) {
        await markSkipped(ctx, postId, "Nessun fatto da raccontare.");
        continue;
      }

      const situation = situationOf(facts.input);

      // Nessuna situazione vuol dire che non c'è niente da dire: nessun campo
      // libero domani, nessun posto rimasto. Non è un guasto, ed è il motivo
      // per cui la riga resta invece di sparire — una serata senza campi liberi
      // e un cron che non è partito devono potersi distinguere.
      if (!situation) {
        await markSkipped(ctx, postId, "Niente da raccontare per oggi.");
        continue;
      }

      const template = await pickTemplate(ctx, kind, situation, format);

      if (!template) {
        await markSkipped(
          ctx,
          postId,
          `Nessuno template approvato per «${situation}»: genera e approva i template da /dashboard/social.`,
        );
        continue;
      }

      const values = valuesOf(facts.input);

      const { status, firstUse } = await applyTemplate(
        ctx,
        row,
        template,
        values,
        `template «${template.situation}» · ${JSON.stringify(values.values)}`,
      );

      if (status === "queued") {
        await ctx.scheduler.runAfter(0, internal.modules.social.queue.default, {
          postId,
        });
        continue;
      }

      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.alert.default,
        {
          title: firstUse
            ? "Primo contenuto da un nuovo template"
            : "Bozza social da approvare",
          message: template.poster.headline,
          url: staffSocialUrl(postId),
          idempotencyKey: `social-review-${postId}`,
        },
      );
    }

    return created;
  },
});
