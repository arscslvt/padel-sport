import { v } from "convex/values";
import { query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";

/**
 * Quanti destinatari raggiungerebbe una comunicazione, modulo per modulo.
 *
 * Serve alla dashboard per scrivere il numero sul pulsante di invio prima che
 * si prema: «Invia a 47 persone» è una conferma, «Invia» è un salto nel buio.
 * Solo conteggi, nessun dato personale — ma passa comunque dal segreto perché
 * la richiesta arriva dalla route dello staff, che ce l'ha già in mano.
 *
 * `stats.ts` conta i *posti* per l'evento, accompagnatori inclusi; qui contano
 * le *caselle di posta*, che sono un'altra cosa: un iscritto con tre
 * accompagnatori resta una mail sola.
 */
export default query({
  args: {
    secret: v.string(),
    forms: v.array(v.object({ eventId: v.string(), blockKey: v.string() })),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    return await Promise.all(
      args.forms.map(async (form) => {
        const entries = await ctx.db
          .query("eventRsvps")
          .withIndex("by_form", (q) =>
            q.eq("eventId", form.eventId).eq("blockKey", form.blockKey),
          )
          .collect();

        const confirmed = entries.filter(
          (entry) => entry.status === "confirmed",
        );

        return {
          eventId: form.eventId,
          blockKey: form.blockKey,
          /** Iscritti raggiungibili: è questo il numero sul pulsante */
          recipients: confirmed.filter((entry) => !entry.unsubscribedAt).length,
          /** Quanti hanno chiesto di non ricevere più comunicazioni */
          unsubscribed: confirmed.filter((entry) => entry.unsubscribedAt)
            .length,
        };
      }),
    );
  },
});
