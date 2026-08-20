import { v } from "convex/values";
import { query } from "../../_generated/server";
import { supportRequestStatus } from "../../tables/supportRequests";
import { assertServer } from "../../utils/serverSecret";

/**
 * Le richieste di assistenza arrivate dal modulo del sito.
 *
 * Riservata allo staff e protetta dal segreto condiviso: sono nomi, mail e
 * numeri di telefono, e l'URL del deployment sta nel bundle del sito. Chi è
 * staff lo sa Clerk, e il controllo vero sta nella route che chiama
 * (app/api/dashboard/requests).
 */
export default query({
  args: {
    secret: v.string(),
    status: v.optional(supportRequestStatus),
  },
  handler: async (ctx, { secret, status }) => {
    assertServer(secret);

    const requests = status
      ? await ctx.db
          .query("supportRequests")
          .withIndex("by_status_created", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("supportRequests").withIndex("by_created").collect();

    // Le più recenti in cima: è l'ordine in cui si smaltiscono.
    return requests.sort((a, b) => b.createdAt - a.createdAt);
  },
});
