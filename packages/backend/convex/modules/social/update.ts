import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import { posterSpec } from "./lib";

/**
 * Lo staff corregge una bozza prima che esca.
 *
 * Si può intervenire finché il contenuto non è partito: su una bozza in attesa,
 * ovviamente, ma anche su una già approvata, perché fra l'approvazione e la
 * pubblicazione può passare del tempo e accorgersi di un refuso in quella
 * finestra è normale.
 *
 * **Toccare la locandina rigenera il lasciapassare**, ed è la riga più
 * importante di questo file. La route che disegna l'immagine la dichiara
 * immutabile e la CDN la prende in parola: senza un indirizzo nuovo, la
 * correzione resterebbe invisibile a chiunque — Meta compreso — perché
 * verrebbe servita la versione vecchia. Il token nuovo non invalida la cache:
 * la rende irrilevante, che è più solido.
 */
export default mutation({
  args: {
    secret: v.string(),
    postId: v.id("socialPosts"),
    caption: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    poster: v.optional(posterSpec),
    altText: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { secret, postId, caption, hashtags, poster, altText },
  ) => {
    assertServer(secret);

    const row = await ctx.db.get(postId);

    if (!row) throw new Error("Contenuto non trovato.");

    if (row.status !== "pending_review" && row.status !== "queued") {
      throw new Error(`Questa bozza non è più modificabile: ${row.status}.`);
    }

    if (caption !== undefined && caption.trim().length === 0) {
      throw new Error("La didascalia non può restare vuota.");
    }

    if (hashtags && hashtags.length > 30) {
      throw new Error("Instagram accetta al massimo 30 hashtag.");
    }

    await ctx.db.patch(postId, {
      ...(caption !== undefined ? { caption: caption.trim() } : {}),
      ...(hashtags !== undefined ? { hashtags } : {}),
      ...(altText !== undefined ? { altText } : {}),
      ...(poster !== undefined
        ? { poster, posterToken: crypto.randomUUID().replaceAll("-", "") }
        : {}),
    });

    return { posterChanged: poster !== undefined };
  },
});
