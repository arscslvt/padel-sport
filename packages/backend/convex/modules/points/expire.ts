import { v } from "convex/values";

import { internalMutation } from "../../functions";
import { closeExit } from "./lib";

/**
 * Cancella i punti in attesa che nessuno ha mai reclamato.
 *
 * Il regolamento e l'informativa promettono 12 mesi: chi in un anno non ha
 * aderito al programma non lo farà, e tenere punti intestati a una persona
 * che non li ha chiesti non ha più una ragione. Gira ogni giorno da
 * `crons.ts`, un club per volta (modules/clubs/cron.ts); i movimenti in
 * attesa sono pochi, una scansione del club basta.
 */

const PENDING_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export default internalMutation({
  args: { clubId: v.id("clubs") },
  handler: async (ctx, { clubId }) => {
    const cutoff = Date.now() - PENDING_TTL_MS;

    const stale = (
      await ctx.db
        .query("pointTransactions")
        .withIndex("by_club", (q) => q.eq("clubId", clubId))
        .collect()
    ).filter((row) => row.pending && row.createdAt < cutoff);

    for (const row of stale) {
      await ctx.db.delete(row._id);
    }

    // Le uscite scadute che il loro timer non ha chiuso: è una rete di
    // sicurezza, di norma non trova nessuno (exit.ts).
    let closed = 0;
    // Tutte le schede del club: l'indice serve solo per il prefisso.
    const players = await ctx.db
      .query("players")
      .withIndex("by_club_code", (q) => q.eq("clubId", clubId))
      .collect();
    for (const player of players) {
      const exit = player.pointsProgram?.exit;
      if (!exit || exit.closedAt) continue;
      if (await closeExit(ctx, player._id)) closed += 1;
    }

    return { removed: stale.length, closed };
  },
});
