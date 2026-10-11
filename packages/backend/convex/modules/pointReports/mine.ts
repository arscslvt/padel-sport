import { query } from "../../_generated/server";
import { getIdentityPlayer } from "../openMatches/lib";

const LIMIT = 10;

/**
 * Le segnalazioni sui punti di chi sta guardando, dalla più recente.
 *
 * Come il portafoglio (points/wallet.ts) legge solo l'identità di Clerk:
 * nessun argomento permette di chiedere quelle di un altro. Torna al cliente
 * solo quello che ha scritto lui e la risposta dello staff — mai note interne.
 */
export default query({
  handler: async (ctx) => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return [];

    const reports = await ctx.db
      .query("pointReports")
      .withIndex("by_player", (q) => q.eq("playerId", player._id))
      .order("desc")
      .take(LIMIT);

    return await Promise.all(
      reports.map(async (report) => {
        const transaction = report.transactionId
          ? await ctx.db.get(report.transactionId)
          : null;

        return {
          id: report._id,
          category: report.category,
          status: report.status,
          message: report.message,
          reply: report.status === "resolved" ? report.staffReply : undefined,
          transaction: transaction
            ? { label: transaction.label, delta: transaction.delta }
            : null,
          createdAt: report.createdAt,
        };
      }),
    );
  },
});
