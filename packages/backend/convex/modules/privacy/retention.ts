import { internal } from "../../_generated/api";
import { internalMutation } from "../../functions";

/**
 * I tempi di conservazione dell'informativa privacy, applicati.
 *
 * L'informativa (apps/web/app/(main)/privacy/page.tsx) promette di cancellare
 * certi dati dopo un tempo preciso: qui quelli che si possono riconoscere da
 * soli, senza che qualcuno decida. Gli altri — account, scheda socio, conto
 * punti di chi esce dal programma — dipendono da un fatto che il database non
 * conosce, la fine del rapporto, e li cancella la segreteria.
 *
 * Gira una volta al giorno (convex/crons.ts). Se trova più righe di un blocco
 * si richiama subito: una mutation sola che cancella migliaia di righe
 * rischierebbe i limiti di Convex.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Richieste di giocatori: 12 mesi dalla data della partita. */
const MATCH_REQUEST_MS = 365 * DAY_MS;
/** Richieste di assistenza: 24 mesi dall'invio. */
const SUPPORT_REQUEST_MS = 730 * DAY_MS;
/**
 * Iscrizioni agli eventi: 18 mesi dall'iscrizione. La data dell'evento sta su
 * Sanity, non qui, e 18 mesi bastano a cadere comunque dopo l'evento.
 */
const EVENT_RSVP_MS = 548 * DAY_MS;

const BATCH = 100;

export default internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const matchRequests = await ctx.db
      .query("matchRequests")
      .withIndex("by_date", (q) => q.lt("matchDate", now - MATCH_REQUEST_MS))
      .take(BATCH);
    for (const request of matchRequests) {
      await ctx.db.delete(request._id);
    }

    const supportRequests = await ctx.db
      .query("supportRequests")
      .withIndex("by_created", (q) =>
        q.lt("createdAt", now - SUPPORT_REQUEST_MS),
      )
      .take(BATCH);
    for (const request of supportRequests) {
      await ctx.db.delete(request._id);
    }

    // Con l'iscrizione se ne va lo storico delle comunicazioni ricevute, che
    // ne ricopia l'indirizzo.
    const rsvps = await ctx.db
      .query("eventRsvps")
      .withIndex("by_created", (q) => q.lt("createdAt", now - EVENT_RSVP_MS))
      .take(BATCH);
    for (const rsvp of rsvps) {
      const deliveries = await ctx.db
        .query("eventCommunicationDeliveries")
        .withIndex("by_rsvp", (q) => q.eq("rsvpId", rsvp._id))
        .collect();
      for (const delivery of deliveries) {
        await ctx.db.delete(delivery._id);
      }
      await ctx.db.delete(rsvp._id);
    }

    const more = [matchRequests, supportRequests, rsvps].some(
      (batch) => batch.length === BATCH,
    );
    if (more) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.privacy.retention.default,
        {},
      );
    }

    return {
      matchRequests: matchRequests.length,
      supportRequests: supportRequests.length,
      eventRsvps: rsvps.length,
    };
  },
});
