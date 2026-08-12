import { ConvexError, v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";

/** Quel che serve a chi annulla per capire cosa ha annullato, e al club per saperlo. */
function snapshot(rsvp: Doc<"eventRsvps">, alreadyCancelled: boolean) {
  return {
    alreadyCancelled,
    name: rsvp.name,
    email: rsvp.email,
    eventTitle: rsvp.eventTitle,
    eventSlug: rsvp.eventSlug,
    eventId: rsvp.eventId,
    blockKey: rsvp.blockKey,
    /** Posti liberati dall'annullamento */
    seats: rsvp.guests + 1,
  };
}

/**
 * Annulla un'iscrizione dal link ricevuto per mail.
 *
 * È pubblica perché il token *è* la credenziale: 122 bit di entropia, uno per
 * iscrizione. Non serve identità e non deve servire — chi si iscrive non ha un
 * account sul sito.
 *
 * Idempotente di proposito: un secondo clic sullo stesso link deve dire «era
 * già annullata», non esplodere. I posti si liberano da soli, perché capienza
 * e duplicati contano solo le righe `confirmed` (vedi `create.ts`).
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
        message: "Questo link di annullamento non è valido.",
      });
    }

    if (rsvp.status === "cancelled") {
      return snapshot(rsvp, true);
    }

    await ctx.db.patch(rsvp._id, {
      status: "cancelled",
      cancelledAt: Date.now(),
    });

    return snapshot(rsvp, false);
  },
});

/**
 * Annulla un'iscrizione dalla dashboard.
 *
 * Stesso effetto, chiave diversa: qui la riga si indica per `_id` e a
 * legittimare la richiesta è la sessione dello staff, non il token.
 */
export const byStaff = mutation({
  args: {
    id: v.id("eventRsvps"),
  },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Serve un accesso per annullare un'iscrizione.");
    }

    const rsvp = await ctx.db.get(id);
    if (!rsvp) {
      throw new ConvexError({
        code: "not_found",
        message: "Iscrizione non trovata.",
      });
    }

    if (rsvp.status === "cancelled") {
      return snapshot(rsvp, true);
    }

    await ctx.db.patch(id, { status: "cancelled", cancelledAt: Date.now() });

    return snapshot(rsvp, false);
  },
});
