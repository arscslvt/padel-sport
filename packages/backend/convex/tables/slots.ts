import { defineTable } from "convex/server";
import { v } from "convex/values";

export default defineTable({
  /** Il club della riga (docs/multi-club.md). Opzionale fino alla Fase 3. */
  clubId: v.optional(v.id("clubs")),
  name: v.string(),
  description: v.optional(v.string()),
  active: v.boolean(),
})
  .index("by_name", ["name"])
  .index("by_club_name", ["clubId", "name"]);
