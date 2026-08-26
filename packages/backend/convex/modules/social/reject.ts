import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";

/**
 * Lo staff scarta una bozza.
 *
 * La riga resta, con il motivo: serve a ricordare che quel fatto è già stato
 * valutato — `claim` non ne creerà un'altra con la stessa chiave — e a dare al
 * compositore, quando gli si chiederà di rifare, qualcosa di più preciso di
 * «non andava bene».
 *
 * Si può scartare anche ciò che è già in coda: fra l'approvazione e la
 * pubblicazione può passare del tempo, e ripensarci in quella finestra è
 * legittimo. Ciò che è già uscito no — quello si toglie da Instagram, e la
 * dashboard deve dirlo invece di fingere un pulsante che non funziona.
 */
export default mutation({
  args: {
    secret: v.string(),
    postId: v.id("socialPosts"),
    reviewedBy: v.string(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, { secret, postId, reviewedBy, feedback }) => {
    assertServer(secret);

    const row = await ctx.db.get(postId);

    if (!row) throw new Error("Contenuto non trovato.");

    if (row.status === "published") {
      throw new Error(
        "Questo contenuto è già uscito: per toglierlo apri Instagram.",
      );
    }

    if (row.status === "publishing") {
      throw new Error("Pubblicazione in corso: riprova fra poco.");
    }

    await ctx.db.patch(postId, {
      status: "rejected",
      reviewedBy,
      reviewedAt: Date.now(),
      feedback,
    });
  },
});
