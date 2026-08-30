import { v } from "convex/values";

import { query } from "../../../_generated/server";
import { assertServer } from "../../../utils/serverSecret";
import { templateFormats } from "../lib";

/**
 * Un singolo template, per disegnarne l'anteprima.
 *
 * Separata da `list` perché la chiama la route che rende l'immagine, e quella
 * ha bisogno di un template solo: farle scaricare l'intero elenco per pescarne
 * uno sarebbe una lettura sprecata a ogni anteprima.
 *
 * Passa dal segreto condiviso come tutto il resto dei template: non sono
 * contenuto pubblico finché non diventano un post.
 */
export default query({
  args: { secret: v.string(), templateId: v.id("socialTemplates") },
  handler: async (ctx, { secret, templateId }) => {
    assertServer(secret);

    const template = await ctx.db.get(templateId);
    if (!template) return null;

    return {
      kind: template.kind,
      situation: template.situation,
      formats: templateFormats(template),
      caption: template.caption,
      hashtags: template.hashtags,
      poster: template.poster,
      backgroundAssetRef: template.backgroundAssetRef,
    };
  },
});
