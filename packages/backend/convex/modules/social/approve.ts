import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";

/**
 * Lo staff dà il via libera a una bozza.
 *
 * Solo da `pending_review`: approvare qualcosa di già pubblicato o già scartato
 * non vuol dire niente, e lasciarlo passare significherebbe rimettere in coda
 * un contenuto uscito la settimana scorsa. Chi arriva secondo su un doppio clic
 * trova la riga già mossa e riceve un errore leggibile.
 *
 * L'accodamento parte da qui e non dal cron: chi approva si aspetta che la cosa
 * esca adesso, non entro un'ora.
 */
export default mutation({
  args: {
    secret: v.string(),
    postId: v.id("socialPosts"),
    /** Chi dello staff sta approvando: serve a firmare la decisione. */
    reviewedBy: v.string(),
  },
  handler: async (ctx, { secret, postId, reviewedBy }) => {
    assertServer(secret);

    const row = await ctx.db.get(postId);

    if (!row) throw new Error("Contenuto non trovato.");

    if (row.status !== "pending_review") {
      throw new Error(
        `Questa bozza non è in attesa di approvazione: ${row.status}.`,
      );
    }

    if (!row.poster || !row.caption) {
      throw new Error("La bozza non ha ancora un testo da pubblicare.");
    }

    await ctx.db.patch(postId, {
      status: "queued",
      reviewedBy,
      reviewedAt: Date.now(),
      error: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.modules.social.queue.default, {
      postId,
    });

    return { scheduledAt: row.scheduledAt };
  },
});
