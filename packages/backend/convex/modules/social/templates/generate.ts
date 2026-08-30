"use node";

import { generateObject } from "ai";
import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import { formatsFor, socialPostKind } from "../lib";
import { socialModel } from "../model";
import {
  PROMPT_VERSION,
  SITUATION_BRIEF,
  type TemplateVariant,
  templateSchema,
  templateSystemPrompt,
  templateUserPrompt,
} from "../prompt";
import { exampleValuesFor, isTemplated } from "../situations";
import { literalsIn, validateTemplate } from "../template";

/**
 * Il modello scrive i template.
 *
 * È l'unico punto in cui un modello tocca i contenuti ricorrenti, e succede una
 * volta per situazione invece che una volta per evento. Ciò che vede sono i
 * nomi dei buchi e dei valori d'esempio inventati: «Rossi / Bianchi», mai una
 * squadra vera. I nomi veri entrano molto più tardi, dentro una mutation, su
 * un template già scritto e già approvato.
 *
 * Quello che esce da qui non è pubblicabile: nasce in attesa di revisione, e
 * qualcuno deve leggerlo. È il senso di tutto l'impianto — si legge una volta
 * una frase che verrà usata cento volte, invece di leggerne cento.
 */
export default internalAction({
  args: {
    kind: socialPostKind,
    situation: v.string(),
    count: v.optional(v.number()),
    /** Cosa non andava nel giro precedente. */
    feedback: v.optional(v.string()),
  },
  // Il tipo di ritorno è scritto a mano e non dedotto: l'azione referenzia
  // `internal`, che a sua volta la contiene, e TypeScript si morde la coda.
  handler: async (
    ctx,
    { kind, situation, count, feedback },
  ): Promise<{ created: number; discarded: number }> => {
    if (!isTemplated(kind)) {
      throw new Error(`«${kind}» non funziona a template.`);
    }

    const brief = SITUATION_BRIEF[`${kind}/${situation}`];

    if (!brief) {
      throw new Error(`Situazione «${situation}» sconosciuta per «${kind}».`);
    }

    const configured = socialModel();
    if ("error" in configured) throw new Error(configured.error);

    const settings = await ctx.runQuery(
      internal.modules.social.data.settings,
      {},
    );

    // I formati non li sceglie chi preme il pulsante: li decide il tipo di
    // contenuto, ed è `formatsFor` a saperlo. Un annuncio d'evento esce come
    // post e come storia, e un unico template copre entrambi.
    const formats = formatsFor(kind);
    const examples = exampleValuesFor(kind);
    const wanted = Math.min(Math.max(count ?? 6, 1), 8);

    const response = await generateObject({
      model: configured.model.model,
      schema: templateSchema,
      maxOutputTokens: 4000,
      // Più alto che per un singolo contenuto: qui si scrive una volta sola
      // qualcosa che verrà usato per mesi, e tenere insieme sei varianti
      // davvero diverse fra loro senza sforare le misure è un lavoro di
      // pianificazione, non di stesura.
      reasoning: "medium",
      instructions: templateSystemPrompt(settings),
      prompt: templateUserPrompt({
        brief,
        formats,
        values: examples.values,
        lists: examples.lists,
        count: wanted,
        baseHashtags: settings.baseHashtags,
        feedback,
      }),
    });

    const accepted: TemplateVariant[] = [];
    const rejected: string[] = [];

    for (const variant of response.object.variants) {
      const unknown = validateTemplate(variant, examples);

      if (unknown.length) {
        rejected.push(`buchi inesistenti: ${unknown.join(", ")}`);
        continue;
      }

      const literals = literalsIn(variant, examples);

      if (literals.length) {
        rejected.push(
          `valori d'esempio scritti a mano: ${literals.join(", ")}`,
        );
        continue;
      }

      accepted.push(variant);
    }

    // Si scartano in silenzio le varianti rotte ma non tutte: se non ne resta
    // nemmeno una, chi ha premuto il pulsante deve sapere perché invece di
    // vedere un elenco vuoto.
    if (accepted.length === 0) {
      throw new Error(
        `Nessuna variante utilizzabile. Motivi: ${rejected.join("; ")}.`,
      );
    }

    await ctx.runMutation(internal.modules.social.templates.data.insertMany, {
      kind,
      situation,
      formats: [...formats],
      variants: accepted,
      model: configured.model.id,
      promptVersion: PROMPT_VERSION,
    });

    return { created: accepted.length, discarded: rejected.length };
  },
});
