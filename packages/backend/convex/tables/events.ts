import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * @deprecated Gli eventi del sito sono gestiti da Sanity (apps/web/sanity/schemas/event.ts)
 * e pubblicati da /studio. La tabella resta per non perdere i dati storici,
 * ma non alimenta più nessuna pagina.
 */

const events = defineTable({
  /** Il club della riga (docs/multi-club.md). */
  clubId: v.id("clubs"),
  title: v.string(),
  description: v.string(),
  date: v.float64(),
  dateEnd: v.optional(v.float64()),
  highlightedAt: v.optional(v.float64()),
  url: v.optional(v.string()),
  socials: v.optional(
    v.object({
      instagramPost: v.optional(v.string()),
      facebookPost: v.optional(v.string()),
    }),
  ),
})
  .index("by_date", ["date"])
  .index("by_club_date", ["clubId", "date"]);

export default events;
