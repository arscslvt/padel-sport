import { serverQuery } from "../../functions";

/**
 * Le segnalazioni sui punti, con quello che serve per rispondere.
 *
 * Riservata allo staff come le richieste di assistenza (supportRequests/list):
 * il segreto la chiude, il controllo su chi è staff sta nella route.
 *
 * Recapiti e movimento si leggono al momento dalla scheda e dal registro: un
 * telefono cambiato nel frattempo è quello giusto da chiamare.
 */
export default serverQuery({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db
      .query("pointReports")
      .withIndex("by_club_created", (q) => q.eq("clubId", ctx.club._id))
      .order("desc")
      .collect();

    return await Promise.all(
      reports.map(async (report) => {
        const player = await ctx.db.get(report.playerId);
        const transaction = report.transactionId
          ? await ctx.db.get(report.transactionId)
          : null;

        return {
          ...report,
          player: player
            ? {
                id: player._id,
                name: player.name,
                email: player.email ?? null,
                phone: player.phone ?? null,
                points: player.points ?? 0,
              }
            : null,
          transaction: transaction
            ? {
                label: transaction.label,
                delta: transaction.delta,
                note: transaction.note ?? null,
                createdAt: transaction.createdAt,
              }
            : null,
        };
      }),
    );
  },
});
