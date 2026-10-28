import { v } from "convex/values";
import { serverMutation } from "../../functions";

/**
 * Chiude un invio aperto da `begin`, con l'esito.
 *
 * Lo status finale guarda a quante mail sono partite, non a quante hanno
 * fallito: se anche una sola è arrivata, la comunicazione *è* stata inviata e
 * lo storico deve dirlo — chi l'ha ricevuta non la riceve una seconda volta.
 * `failed` resta accanto per far vedere quanto è andato storto.
 */
export default serverMutation({
  args: {
    id: v.id("eventCommunications"),
    delivered: v.float64(),
    failed: v.float64(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return;

    await ctx.db.patch(args.id, {
      status: args.delivered > 0 ? "sent" : "failed",
      delivered: args.delivered,
      failed: args.failed,
      completedAt: Date.now(),
      error: args.error,
    });
  },
});
