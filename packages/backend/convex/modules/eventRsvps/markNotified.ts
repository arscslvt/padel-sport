import { v } from "convex/values";
import { clubMutation } from "../../functions";

/**
 * Segna che le mail di conferma sono partite.
 *
 * Gemella di `matchRequests/markNotified`: è pubblica perché il chiamante è un
 * route handler senza sessione e l'unico effetto è scrivere un timestamp su
 * un'iscrizione già esistente.
 */
export default clubMutation({
  args: {
    id: v.id("eventRsvps"),
  },
  handler: async (ctx, { id }) => {
    const rsvp = await ctx.db.get(id);
    if (!rsvp) return;

    await ctx.db.patch(id, { notifiedAt: Date.now() });
  },
});
