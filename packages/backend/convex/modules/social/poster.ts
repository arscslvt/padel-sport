import { v } from "convex/values";

import { query } from "../../_generated/server";

/**
 * Quel poco che serve per disegnare una locandina.
 *
 * È l'unica query pubblica di questo modulo, e la chiama una route che Meta
 * deve poter scaricare senza credenziali. Per questo non restituisce la riga:
 * restituisce le sole proprietà di disegno. Fuori restano i fatti consegnati al
 * modello, la firma di chi ha approvato, la chiave del trigger — cose che non
 * servono a dipingere e che nessuno all'esterno deve poter leggere.
 *
 * Il `token` non è un orpello: gli `_id` di Convex non sono un segreto, e una
 * bozza non ancora approvata non è contenuto pubblico. Cambiare la bozza ne
 * genera uno nuovo, e questo permette di servire l'immagine come immutabile pur
 * potendola correggere — l'indirizzo vecchio semplicemente smette di esistere.
 *
 * La domanda da farsi rileggendo questo file è una sola: se questo indirizzo
 * finisse su Twitter, cosa si vedrebbe? La risposta dev'essere «esattamente
 * l'immagine che stiamo per pubblicare».
 */
export default query({
  args: { postId: v.id("socialPosts"), token: v.string() },
  handler: async (ctx, { postId, token }) => {
    const row = await ctx.db.get(postId);

    if (!row || !row.poster) return null;
    if (row.posterToken !== token) return null;

    return {
      format: row.format,
      spec: row.poster,
      backgroundAssetRef: row.backgroundAssetRef,
      altText: row.altText,
    };
  },
});
