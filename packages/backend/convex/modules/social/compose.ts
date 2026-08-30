"use node";

import { generateObject } from "ai";
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { staffSocialUrl } from "../../utils/staffLinks";
import { buildFacts, type FactsInput } from "./anonymity";
import { listCandidates } from "./assets";
import { socialModel } from "./model";
import {
  draftSchema,
  PROMPT_VERSION,
  systemPrompt,
  userPrompt,
} from "./prompt";
import { isTemplated } from "./situations";

/**
 * Scrive da capo il contenuto di una riga, quando non c'è un template che possa
 * farlo.
 *
 * Da quando i contenuti ricorrenti passano dai template, qui arrivano soltanto
 * i consigli tecnici: gli unici che ogni volta sono davvero contenuto nuovo, e
 * che partono da dati pubblici — un consiglio sul rovescio non riguarda
 * nessuno in particolare.
 *
 * Gira in Node perché usa l'SDK dei modelli, e questo è il motivo per cui ogni
 * accesso al database passa da `data.ts`: un file `"use node"` può esportare
 * soltanto azioni. È la stessa separazione di `modules/courtCalendar`.
 *
 * Quale modello scriva lo decide `model.ts` da una variabile d'ambiente: qui
 * dentro non compare il nome di nessun fornitore.
 *
 * L'uscita del modello è vincolata a uno schema, e non per comodità di
 * lettura: la locandina è un modulo prestampato, e il modello deve riempirne
 * gli spazi, non decidere quanto sono grandi. Ciò che non sta dentro le misure
 * verrebbe tagliato al disegno, il che è un modo peggiore di scoprirlo.
 *
 * Il testo consegnato al modello viene scritto sulla riga **anche quando il
 * tentativo fallisce**: è l'unico posto in cui, mesi dopo, si può verificare
 * che una promessa di anonimato sia stata mantenuta.
 */

/** Il tetto: le didascalie sono corte, e un tetto basso limita i danni di un ciclo impazzito. */
const MAX_TOKENS = 2000;

export default internalAction({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const row = await ctx.runQuery(internal.modules.social.data.forCompose, {
      postId,
    });

    if (!row || row.status !== "drafting") return;

    // Un tipo con i template non deve finire qui: sarebbe una chiamata al
    // modello dove avevamo deciso che non ne servono, e con dati che avevamo
    // deciso di non far uscire. Meglio fermarsi e dirlo.
    if (isTemplated(row.kind)) {
      await ctx.runMutation(internal.modules.social.data.abandon, {
        postId,
        status: "failed",
        error: `«${row.kind}» funziona a template: non deve passare dal modello.`,
      });
      return;
    }

    const configured = socialModel();

    // Configurazione mancante o scritta male: si archivia dicendo cosa, invece
    // di lasciare la riga appesa in composizione finché lo spazzino non la
    // raccoglie con un messaggio generico.
    if ("error" in configured) {
      await ctx.runMutation(internal.modules.social.data.abandon, {
        postId,
        status: "failed",
        error: configured.error,
      });
      return;
    }

    let facts = "";

    try {
      const settings = await ctx.runQuery(
        internal.modules.social.data.settings,
        {},
      );

      const subject = await ctx.runQuery(
        internal.modules.social.data.factsFor,
        { postId },
      );

      // Il trigger non è agganciato, o il documento sorgente è sparito fra la
      // rivendicazione e adesso. In entrambi i casi non c'è niente da dire.
      if (!subject) {
        await ctx.runMutation(internal.modules.social.data.abandon, {
          postId,
          status: "skipped",
          error: "Nessun fatto da raccontare per questo contenuto.",
        });
        return;
      }

      facts = buildFacts(subject.input as FactsInput);

      const assets = await listCandidates(row.kind, row.format);

      const response = await generateObject({
        model: configured.model.model,
        schema: draftSchema,
        maxOutputTokens: MAX_TOKENS,
        // Basso di proposito: confezionare fatti già pronti in tre righe non è
        // un problema di ragionamento, e alzarlo qui costerebbe tempo e denaro
        // senza cambiare il risultato.
        reasoning: "low",
        instructions: systemPrompt(settings),
        prompt: userPrompt({
          kind: row.kind,
          format: row.format,
          facts,
          recent: [],
          assets: assets.map(({ id, description, usage }) => ({
            id,
            description,
            usage,
          })),
          baseHashtags: settings.baseHashtags,
          feedback: row.feedback,
        }),
      });

      const draft = response.object;

      // Un identificativo che non è fra i candidati non è una scelta, è
      // un'invenzione: si ignora invece di scrivere sulla riga un riferimento
      // che non punta a niente.
      const chosen = assets.find(
        (asset) => asset.id === draft.backgroundAssetId,
      );

      const { status } = await ctx.runMutation(
        internal.modules.social.data.completeCompose,
        {
          postId,
          facts,
          caption: draft.caption,
          hashtags: draft.hashtags,
          poster: {
            ...draft.poster,
            // Senza fotografia il trattamento «photo» disegnerebbe il fondo
            // generato ma con i colori pensati per starci sopra: si ripiega
            // sul fondo scuro, che è la cosa che il modello voleva dire.
            accent:
              draft.poster.accent === "photo" && !chosen
                ? "ink"
                : draft.poster.accent,
          },
          altText: draft.altText,
          backgroundAssetRef: chosen?.ref,
          linkUrl: "asdpadelsport.com/book",
          model: configured.model.id,
          promptVersion: PROMPT_VERSION,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        },
      );

      if (status === "queued") {
        await ctx.scheduler.runAfter(0, internal.modules.social.queue.default, {
          postId,
        });
        return;
      }

      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.alert.default,
        {
          title: "Bozza social da approvare",
          message: draft.poster.headline,
          url: staffSocialUrl(postId),
          idempotencyKey: `social-review-${postId}`,
        },
      );
    } catch (error) {
      console.error("Composizione del contenuto social fallita:", error);

      await ctx.runMutation(internal.modules.social.data.failCompose, {
        postId,
        error: error instanceof Error ? error.message : "Errore sconosciuto.",
        facts,
      });

      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.alert.default,
        {
          title: "Contenuto social non composto",
          message: `Trigger ${row.kind}, chiave ${row.triggerKey}.`,
          url: staffSocialUrl(postId),
          idempotencyKey: `social-compose-error-${postId}`,
        },
      );
    }
  },
});
