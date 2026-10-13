import { internalMutation } from "../../_generated/server";
import { closeExit } from "./lib";

/**
 * Cancella i punti in attesa che nessuno ha mai reclamato.
 *
 * Il regolamento e l'informativa promettono 12 mesi: chi in un anno non ha
 * aderito al programma non lo farà, e tenere punti intestati a una persona
 * che non li ha chiesti non ha più una ragione. Gira ogni giorno da
 * `crons.ts`; i movimenti in attesa sono pochi, una scansione basta.
 */

const PENDING_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export default internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - PENDING_TTL_MS;

    const stale = (await ctx.db.query("pointTransactions").collect()).filter(
      (row) => row.pending && row.createdAt < cutoff,
    );

    for (const row of stale) {
      await ctx.db.delete(row._id);
    }

    // Le uscite scadute che il loro timer non ha chiuso: è una rete di
    // sicurezza, di norma non trova nessuno (exit.ts).
    let closed = 0;
    for (const player of await ctx.db.query("players").collect()) {
      const exit = player.pointsProgram?.exit;
      if (!exit || exit.closedAt) continue;
      if (await closeExit(ctx, player._id)) closed += 1;
    }

    return { removed: stale.length, closed };
  },
});
