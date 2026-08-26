import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import { DEFAULT_SOCIAL_SETTINGS, socialPostKind } from "./lib";

/**
 * Come e se il circolo parla sui social.
 *
 * Lettura e scrittura passano entrambe dal segreto condiviso, al contrario
 * della configurazione delle prenotazioni dove la lettura è pubblica: gli orari
 * di apertura li deve vedere chi prenota, il tono di voce del circolo no.
 *
 * L'interruttore generale nasce spento e questo modulo è l'unico modo di
 * accenderlo. Non è un dettaglio rimandabile a quando ci sarà il pannello: un
 * sistema che si accende da solo appena viene messo in produzione è un sistema
 * che pubblica prima che qualcuno abbia deciso che è pronto.
 */

export const get = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertServer(secret);

    const row = await ctx.db.query("socialSettings").first();

    if (!row) return { ...DEFAULT_SOCIAL_SETTINGS, updatedAt: null };

    return {
      enabled: row.enabled,
      disabledKinds: row.disabledKinds,
      maxPerDay: row.maxPerDay,
      tone: row.tone,
      avoid: row.avoid,
      baseHashtags: row.baseHashtags,
      updatedAt: row.updatedAt,
    };
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    enabled: v.optional(v.boolean()),
    disabledKinds: v.optional(v.array(socialPostKind)),
    maxPerDay: v.optional(v.number()),
    tone: v.optional(v.string()),
    avoid: v.optional(v.string()),
    baseHashtags: v.optional(v.array(v.string())),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, { secret, ...changes }) => {
    assertServer(secret);

    if (changes.maxPerDay !== undefined) {
      if (!Number.isInteger(changes.maxPerDay) || changes.maxPerDay < 1) {
        throw new Error("Il tetto giornaliero deve essere almeno 1.");
      }

      // Un tetto molto alto non è una configurazione, è la rinuncia a una rete
      // di sicurezza: una giornata di torneo, senza, riempie il profilo.
      if (changes.maxPerDay > 10) {
        throw new Error("Più di dieci contenuti al giorno non è un tetto.");
      }
    }

    const existing = await ctx.db.query("socialSettings").first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { ...changes, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("socialSettings", {
      ...DEFAULT_SOCIAL_SETTINGS,
      ...changes,
      updatedAt: now,
    });
  },
});
