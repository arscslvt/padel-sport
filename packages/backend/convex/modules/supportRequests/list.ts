import { v } from "convex/values";
import { serverQuery } from "../../functions";
import { supportRequestStatus } from "../../tables/supportRequests";

/**
 * Le richieste di assistenza arrivate dal modulo del sito.
 *
 * Riservata allo staff e protetta dal segreto condiviso: sono nomi, mail e
 * numeri di telefono, e l'URL del deployment sta nel bundle del sito. Chi è
 * staff lo sa Clerk, e il controllo vero sta nella route che chiama
 * (app/api/dashboard/requests).
 */
export default serverQuery({
  args: {
    status: v.optional(supportRequestStatus),
  },
  handler: async (ctx, { status }) => {
    const requests = status
      ? await ctx.db
          .query("supportRequests")
          .withIndex("by_club_status_created", (q) =>
            q.eq("clubId", ctx.club._id).eq("status", status),
          )
          .collect()
      : await ctx.db
          .query("supportRequests")
          .withIndex("by_club_created", (q) => q.eq("clubId", ctx.club._id))
          .collect();

    // Le più recenti in cima: è l'ordine in cui si smaltiscono.
    return requests.sort((a, b) => b.createdAt - a.createdAt);
  },
});
