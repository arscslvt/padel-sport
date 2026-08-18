import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Giocatore che partecipa a una partita ma non ha l'app: di lui si sa solo il
 * nome, inserito da chi organizza. Non c'è nulla da accettare, è lì per
 * conoscenza — ma occupa un posto in campo come tutti gli altri.
 *
 * La mail è facoltativa e per ora viene solo raccolta: servirà a invitarlo a
 * scaricare l'app. `invitedAt` segna quando quell'invito è partito, così la
 * campagna può ripescare chi non l'ha ancora ricevuto senza scrivergli due
 * volte.
 *
 * È una tabella e non un array sulla partita proprio per quella campagna:
 * gli indirizzi vanno interrogati per conto loro, senza passare dai match.
 */
const matchGuests = defineTable({
  matchId: v.id("openMatches"),
  name: v.string(),
  email: v.optional(v.string()),
  /** Chi l'ha aggiunto: solo il creatore della partita può farlo. */
  addedBy: v.id("players"),
  createdAt: v.float64(),
  invitedAt: v.optional(v.float64()),
})
  .index("by_match", ["matchId"])
  .index("by_email", ["email"]);

export default matchGuests;
