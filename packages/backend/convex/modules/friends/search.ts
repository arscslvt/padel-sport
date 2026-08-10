import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { getIdentityPlayer, toPlayerView } from "../openMatches/lib";
import { friendshipBetween, relationOf, type SearchResultView } from "./lib";

const MAX_RESULTS = 20;

/** Un codice giocatore: solo cifre, come quelli generati alla creazione. */
const CODE_PATTERN = /^\d{4,6}$/;

/**
 * Cerca giocatori per nome o per codice, per proporre nuove amicizie.
 *
 * Ogni risultato porta con sé il rapporto già esistente con chi cerca, così
 * l'app mostra "già amico" o "richiesta inviata" invece di riproporre
 * un'azione che verrebbe rifiutata.
 */
export default query({
  args: { term: v.string() },
  handler: async (ctx, { term }): Promise<SearchResultView[]> => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return [];

    const trimmed = term.trim();
    if (trimmed.length < 2) return [];

    let matches: Doc<"players">[];

    if (CODE_PATTERN.test(trimmed)) {
      const byCode = await ctx.db
        .query("players")
        .withIndex("by_code", (q) => q.eq("code", trimmed))
        .first();

      matches = byCode ? [byCode] : [];
    } else {
      matches = await ctx.db
        .query("players")
        .withSearchIndex("by_name", (q) => q.search("name", trimmed))
        .take(MAX_RESULTS);
    }

    const results: SearchResultView[] = [];

    for (const match of matches) {
      if (match._id === player._id) continue;

      const friendship = await friendshipBetween(ctx, player._id, match._id);

      results.push({
        player: toPlayerView(match),
        relation: relationOf(friendship, player._id),
        friendshipId: friendship?._id ?? null,
      });
    }

    return results;
  },
});
