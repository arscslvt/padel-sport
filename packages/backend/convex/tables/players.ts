import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Profilo giocatore dell'app mobile, collegato all'utente Clerk.
 * Il livello segue la scala padel 1.0 – 5.0.
 */
const players = defineTable({
  clerkUserId: v.string(),
  name: v.string(),
  level: v.float64(),
  avatarUrl: v.optional(v.string()),
  createdAt: v.float64(),
}).index("by_clerk_user_id", ["clerkUserId"]);

export default players;
