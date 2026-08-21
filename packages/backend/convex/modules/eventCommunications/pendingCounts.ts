import { v } from "convex/values";
import { query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import { communicationCoverage, isReached, reachable } from "./lib";

/**
 * Quanti iscritti non hanno ancora ricevuto una comunicazione, modulo per
 * modulo.
 *
 * È il numero che permette alla dashboard di proporre «invia ai 3 nuovi»
 * invece del solo «invia di nuovo a tutti»: senza, l'unica strada per
 * raggiungere chi si è iscritto dopo sarebbe rimandare la mail a chi l'ha già
 * ricevuta.
 *
 * Prende una lista perché la pagina mostra tutte le comunicazioni insieme, come
 * `list.ts`: una query per card sarebbe una chiamata per card.
 */
export default query({
  args: {
    secret: v.string(),
    targets: v.array(
      v.object({
        documentId: v.string(),
        eventId: v.string(),
        blockKey: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    return await Promise.all(
      args.targets.map(async (target) => {
        const [coverage, entries] = await Promise.all([
          communicationCoverage(ctx, target.documentId, target.blockKey),
          ctx.db
            .query("eventRsvps")
            .withIndex("by_form", (q) =>
              q.eq("eventId", target.eventId).eq("blockKey", target.blockKey),
            )
            .collect(),
        ]);

        const recipients = reachable(entries);
        const pending = recipients.filter(
          (entry) => !isReached(coverage, entry),
        ).length;

        return {
          documentId: target.documentId,
          blockKey: target.blockKey,
          /** Iscritti raggiungibili che non l'hanno ancora ricevuta */
          pending,
          /** Quanti, fra i raggiungibili di oggi, l'hanno già ricevuta */
          reached: recipients.length - pending,
        };
      }),
    );
  },
});
