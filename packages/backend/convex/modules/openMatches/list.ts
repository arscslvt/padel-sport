import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getIdentityPlayer, toMatchView } from "./lib";

/**
 * Partite aperte future con posti liberi, ordinate per data.
 *
 * Esclude quelle create dall'utente loggato: le ritrova fra le sue
 * prenotazioni e non può unirsi a sé stesso. Con `includeOwn: true` vengono
 * incluse (es. per una vista riepilogativa).
 */
export default query({
  args: { includeOwn: v.optional(v.boolean()) },
  handler: async (ctx, { includeOwn }) => {
    const matches = await ctx.db
      .query("openMatches")
      .withIndex("by_status_date", (q) =>
        q.eq("status", "open").gte("matchDate", Date.now()),
      )
      .order("asc")
      .take(50);

    const player = includeOwn ? null : await getIdentityPlayer(ctx);
    const visible = player
      ? matches.filter((match) => match.creatorId !== player._id)
      : matches;

    return await Promise.all(visible.map((match) => toMatchView(ctx, match)));
  },
});
