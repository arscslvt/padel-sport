import { v } from "convex/values";
import { mutation } from "../../_generated/server";

/**
 * Segna che le mail di notifica sono partite.
 *
 * Chiamata dalla route del sito dopo l'invio, così la segreteria distingue le
 * richieste arrivate anche via mail da quelle presenti solo a database.
 * È pubblica perché il chiamante è un route handler senza sessione: l'unico
 * effetto è scrivere un timestamp su una richiesta già esistente.
 */
export default mutation({
  args: {
    id: v.id("matchRequests"),
  },
  handler: async (ctx, { id }) => {
    const request = await ctx.db.get(id);
    if (!request) return;

    await ctx.db.patch(id, { notifiedAt: Date.now() });
  },
});
