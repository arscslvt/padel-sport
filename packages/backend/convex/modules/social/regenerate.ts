import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";

/**
 * Lo staff chiede di rifare una bozza.
 *
 * Riporta la riga in composizione e rimette in moto il modello, stavolta con
 * l'indicazione di chi ha detto di no. È la differenza fra scartare e
 * correggere: scartare chiude la questione, questo la riapre — e il fatto
 * mantiene la sua chiave, quindi non nasce una seconda riga a fargli
 * concorrenza.
 *
 * Vale anche su una stesura fallita: il guasto poteva essere passeggero, e
 * ritentare a mano è più semplice che aspettare che ricapiti il trigger.
 */
export default mutation({
  args: {
    secret: v.string(),
    postId: v.id("socialPosts"),
    reviewedBy: v.string(),
    /** Cosa non andava. Finisce nel prompt, quindi conviene essere precisi. */
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, { secret, postId, reviewedBy, feedback }) => {
    assertServer(secret);

    const row = await ctx.db.get(postId);

    if (!row) throw new Error("Contenuto non trovato.");

    const rewritable =
      row.status === "pending_review" ||
      row.status === "failed" ||
      row.status === "rejected";

    if (!rewritable) {
      throw new Error(`Questa bozza non si può rifare: ${row.status}.`);
    }

    await ctx.db.patch(postId, {
      status: "drafting",
      feedback,
      reviewedBy,
      reviewedAt: Date.now(),
      error: undefined,
      // Il lucchetto riparte adesso: senza, lo spazzino considererebbe morta
      // in partenza una riga rimessa in composizione dopo giorni.
      publishStartedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.modules.social.compose.default, {
      postId,
    });
  },
});
