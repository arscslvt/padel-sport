import { ConvexError, v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";

/** Quel che serve alla pagina di conferma per dire cosa è appena successo. */
function snapshot(rsvp: Doc<"eventRsvps">, alreadyUnsubscribed: boolean) {
  return {
    alreadyUnsubscribed,
    id: rsvp._id,
    name: rsvp.name,
    eventTitle: rsvp.eventTitle,
    eventSlug: rsvp.eventSlug,
    /** L'iscrizione resta quella che è: serve dirlo a chi si è appena disiscritto */
    status: rsvp.status,
  };
}

/**
 * Smette di mandare comunicazioni su un evento a chi lo chiede dal link in
 * fondo alla mail.
 *
 * **Non annulla l'iscrizione.** Sono due cose distinte e vanno tenute
 * distinte: chi non vuole più le mail all'evento ci viene lo stesso, e
 * liberargli il posto sarebbe un danno fatto per zelo. Per annullare c'è
 * `cancel.ts`, che è un'altra pagina e un altro pulsante.
 *
 * La credenziale è lo stesso `cancelToken` dell'annullamento: è già una riga
 * sola per iscrizione, già in ogni mail di conferma, e riusarlo evita di
 * generare e migrare un secondo segreto per la stessa persona.
 *
 * Idempotente come la gemella: un secondo clic dice «eri già disiscritto».
 */
export default mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    const rsvp = await ctx.db
      .query("eventRsvps")
      .withIndex("by_cancel_token", (q) => q.eq("cancelToken", token))
      .unique();

    if (!rsvp) {
      throw new ConvexError({
        code: "not_found",
        message: "Questo link non è valido.",
      });
    }

    if (rsvp.unsubscribedAt) {
      return snapshot(rsvp, true);
    }

    await ctx.db.patch(rsvp._id, { unsubscribedAt: Date.now() });

    return snapshot(rsvp, false);
  },
});
