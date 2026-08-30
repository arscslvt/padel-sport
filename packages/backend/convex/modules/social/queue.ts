import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import type { SocialChannel } from "./lib";

/**
 * Il giunto fra chi scrive un contenuto e chi lo pubblica.
 *
 * Esiste perché la composizione non sappia che i canali esistono. Chi riempie
 * un template riempie una riga; da qui in poi si decide su quale profilo
 * finisce e con che regole — Instagram concatena gli hashtag in fondo e regge
 * una sola immagine per le storie, Facebook ha altri gusti e altri limiti.
 *
 * Aggiungere un canale è una riga in questa mappa più il suo modulo. Non c'è
 * nessun `if` da toccare: è il motivo per cui questo file esiste invece di una
 * chiamata diretta al pubblicatore.
 */
const PUBLISHERS: Record<
  SocialChannel,
  typeof internal.modules.social.instagram.publish.default
> = {
  instagram: internal.modules.social.instagram.publish.default,
};

export default internalAction({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const row = await ctx.runQuery(internal.modules.social.data.forCompose, {
      postId,
    });

    if (!row || row.status !== "queued") return;

    // Il lucchetto lo prende il pubblicatore, non questo: qui si sceglie solo
    // la strada. Prenderlo prima significherebbe doverlo restituire in ogni
    // ramo d'errore di un file che non sa niente di come si pubblica.
    await ctx.scheduler.runAfter(0, PUBLISHERS[row.channel], { postId });
  },
});
