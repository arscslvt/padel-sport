import { v } from "convex/values";

import { mutation } from "../../../_generated/server";
import { assertServer } from "../../../utils/serverSecret";

/**
 * Lo staff decide su un template.
 *
 * È la revisione che conta davvero in tutto questo sistema: si legge una volta
 * una frase che verrà usata cento volte. Approvarla la mette in circolo — ma
 * il primo contenuto che ne nasce farà comunque una sosta in dashboard, perché
 * è lì, con i buchi riempiti di dati veri, che si vedono gli errori che sullo
 * template vuoto non si notano.
 *
 * `retired` non è `rejected`: il primo è per un template che ha lavorato e va
 * sostituito, il secondo per uno che non ha mai convinto. Tenerli distinti
 * serve a capire, guardando indietro, se il modello scriveva male o se sono
 * cambiati i gusti.
 */
export default mutation({
  args: {
    secret: v.string(),
    templateId: v.id("socialTemplates"),
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("retired"),
    ),
    reviewedBy: v.string(),
    feedback: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { secret, templateId, status, reviewedBy, feedback },
  ) => {
    assertServer(secret);

    const template = await ctx.db.get(templateId);
    if (!template) throw new Error("Template non trovato.");

    if (status === "retired" && template.status !== "approved") {
      throw new Error("Si può ritirare solo un template in uso.");
    }

    await ctx.db.patch(templateId, {
      status,
      reviewedBy,
      reviewedAt: Date.now(),
      feedback,
    });
  },
});
