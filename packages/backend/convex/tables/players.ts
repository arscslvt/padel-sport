import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Profilo giocatore dell'app mobile, collegato all'utente Clerk.
 * Il livello segue la scala padel 1.0 – 5.0.
 *
 * `code` è il codice pubblico con cui gli amici si cercano tra loro: è
 * opzionale perché i profili creati prima della sua introduzione lo ricevono
 * al primo salvataggio (modules/openMatches/players.ts).
 */
const players = defineTable({
  clerkUserId: v.string(),
  name: v.string(),
  level: v.float64(),
  avatarUrl: v.optional(v.string()),
  code: v.optional(v.string()),
  createdAt: v.float64(),
})
  .index("by_clerk_user_id", ["clerkUserId"])
  .index("by_code", ["code"])
  .searchIndex("by_name", { searchField: "name" });

export default players;
