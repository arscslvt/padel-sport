import { v } from "convex/values";
import { query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import {
  communicationCoverage,
  isReached,
  reachable,
} from "../eventCommunications/lib";

/**
 * Chi deve ricevere una comunicazione su un evento, con il token che comporrà
 * il suo link di disiscrizione.
 *
 * Separata da `list.ts` di proposito, anche se legge le stesse righe: `list` la
 * chiama la dashboard e il suo risultato finisce nel browser, dove il
 * `cancelToken` non ha niente da fare — è la credenziale che annulla
 * un'iscrizione, e per annullare la dashboard ha già la sua route. Qui il
 * chiamante è una route server che sta per comporre delle mail, e il token le
 * serve.
 *
 * Fuori restano gli annullati (`status`) e chi ha chiesto di non ricevere più
 * niente (`unsubscribedAt`): il filtro sta qui e non nella route, così non c'è
 * modo di scordarselo in un secondo punto di invio.
 *
 * Con `audience: "pending"` esce solo chi la comunicazione non ce l'ha ancora:
 * è la lista per raggiungere gli iscritti arrivati dopo il primo invio senza
 * rimandarla a tutti. Anche questo filtro sta qui per lo stesso motivo — è la
 * differenza fra una mail nuova e una mail doppia.
 */
export default query({
  args: {
    secret: v.string(),
    eventId: v.string(),
    blockKey: v.string(),
    /** `_id` del documento Sanity: serve solo a sapere chi l'ha già ricevuto */
    documentId: v.optional(v.string()),
    audience: v.optional(v.union(v.literal("all"), v.literal("pending"))),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    const entries = await ctx.db
      .query("eventRsvps")
      .withIndex("by_form", (q) =>
        q.eq("eventId", args.eventId).eq("blockKey", args.blockKey),
      )
      .collect();

    let recipients = reachable(entries);

    if (args.audience === "pending" && args.documentId) {
      const coverage = await communicationCoverage(
        ctx,
        args.documentId,
        args.blockKey,
      );

      recipients = recipients.filter((entry) => !isReached(coverage, entry));
    }

    return recipients
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((entry) => ({
        /** Serve alla route per registrare la consegna, non lascia il server */
        id: entry._id,
        name: entry.name,
        email: entry.email,
        cancelToken: entry.cancelToken,
      }));
  },
});
