import { v } from "convex/values";
import { query } from "../../_generated/server";
import { matchRequestStatus } from "../../tables/matchRequests";
import { assertServer } from "../../utils/serverSecret";

/**
 * Le richieste di giocatori arrivate dal modulo pubblico del sito.
 *
 * Riservata allo staff e protetta dal segreto condiviso, per la stessa ragione
 * dell'assistenza: qui non c'è un `players` collegato, solo i recapiti lasciati
 * nel modulo da chi cerca compagni di partita.
 */
export default query({
  args: {
    secret: v.string(),
    status: v.optional(matchRequestStatus),
  },
  handler: async (ctx, { secret, status }) => {
    assertServer(secret);

    const requests = status
      ? await ctx.db
          .query("matchRequests")
          .withIndex("by_status_date", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("matchRequests").withIndex("by_date").collect();

    // Ordinate per data della partita: la segreteria evade prima chi gioca
    // prima, e una richiesta per domani non può stare sotto una per il mese
    // prossimo solo perché è arrivata dopo.
    return requests.sort((a, b) => a.matchDate - b.matchDate);
  },
});
