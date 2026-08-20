import { v } from "convex/values";
import { query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";

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
 */
export default query({
  args: {
    secret: v.string(),
    eventId: v.string(),
    blockKey: v.string(),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    const entries = await ctx.db
      .query("eventRsvps")
      .withIndex("by_form", (q) =>
        q.eq("eventId", args.eventId).eq("blockKey", args.blockKey),
      )
      .collect();

    return entries
      .filter((entry) => entry.status === "confirmed" && !entry.unsubscribedAt)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((entry) => ({
        name: entry.name,
        email: entry.email,
        cancelToken: entry.cancelToken,
      }));
  },
});
