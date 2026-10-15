import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getIdentityPlayer } from "./lib";

const MAX_RESULTS = 6;

/** Quanti candidati leggere dall'indice prima di filtrare chi non vuole farsi trovare. */
const SCAN = 40;

/**
 * I compagni che si possono invitare mentre si prenota, cercati per nome.
 *
 * Esce solo chi ha detto di sì dalla propria area personale
 * (`players.searchableSince`), ha un account con cui accettare l'invito e non
 * è sospeso. Di ognuno si mostrano il nome e il livello e nient'altro:
 * telefono e mail restano del club.
 *
 * Chi non c'è si scrive a mano, come sempre: il campo resta libero.
 */
export default query({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return [];

    const trimmed = term.trim();
    if (trimmed.length < 2) return [];

    const candidates = await ctx.db
      .query("players")
      .withSearchIndex("by_name", (q) => q.search("name", trimmed))
      .take(SCAN);

    return candidates
      .filter(
        (candidate) =>
          candidate._id !== player._id &&
          candidate.searchableSince !== undefined &&
          candidate.clerkUserId !== undefined &&
          !candidate.suspension,
      )
      .slice(0, MAX_RESULTS)
      .map((candidate) => ({
        id: candidate._id,
        name: candidate.name,
        level: candidate.level,
        avatarUrl: candidate.avatarUrl,
      }));
  },
});
