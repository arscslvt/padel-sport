import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

/**
 * Il giunto fra chi scrive un contenuto e chi lo pubblica.
 *
 * Esiste perché la composizione non sappia che i canali esistono. Chi compone
 * riempie una riga; da qui in poi si decide su quale profilo finisce e con che
 * regole — Instagram concatena gli hashtag in fondo e regge solo un'immagine
 * per le storie, Facebook ha altri gusti e altri limiti. Senza questo strato,
 * aggiungere un canale vorrebbe dire mettere le mani nel compositore.
 *
 * **In questa versione non pubblica niente.** Prende il lucchetto e chiude la
 * riga come pubblicata senza codice esterno: serve a far camminare la macchina
 * a stati per intero — e a tarare il compositore su una settimana di traffico
 * vero — prima che qualcuno legga qualcosa. Il pubblicatore vero arriva con le
 * credenziali di Meta, e da lì la riga porterà anche `externalId` e
 * `permalink`.
 *
 * Le righe chiuse adesso non verranno ripubblicate all'accensione: il
 * pubblicatore tratta solo lo stato `queued`, e queste sono già `published`.
 */
export default internalAction({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const row = await ctx.runMutation(
      internal.modules.social.data.beginPublish,
      { postId },
    );

    // Il lucchetto non si è aperto: la riga non era pronta, oppure qualcun
    // altro la sta già pubblicando. In entrambi i casi non è affar nostro.
    if (!row) return;

    await ctx.runMutation(internal.modules.social.data.completePublish, {
      postId,
    });
  },
});
