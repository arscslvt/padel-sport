import { v } from "convex/values";
import { mutation } from "../../_generated/server";

/**
 * Segna che le mail di notifica sono partite.
 *
 * Pubblica perché il chiamante è un route handler senza sessione: l'unico
 * effetto è scrivere un timestamp su una richiesta già esistente.
 */
export default mutation({
  args: {
    id: v.id("supportRequests"),
  },
  handler: async (ctx, { id }) => {
    const request = await ctx.db.get(id);
    if (!request) return;

    await ctx.db.patch(id, { notifiedAt: Date.now() });
  },
});
