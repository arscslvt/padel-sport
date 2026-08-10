import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Legame di amicizia tra due giocatori, in una sola riga per coppia.
 *
 * Finché `status` è `pending` la richiesta è partita da `requesterId` e
 * aspetta la risposta di `addresseeId`; con `accepted` l'amicizia vale in
 * entrambe le direzioni e i due ruoli restano solo come storia di chi ha
 * fatto il primo passo. Un rifiuto cancella la riga, così si può richiedere
 * di nuovo più avanti.
 */
const friendships = defineTable({
  requesterId: v.id("players"),
  addresseeId: v.id("players"),
  status: v.union(v.literal("pending"), v.literal("accepted")),
  createdAt: v.float64(),
  respondedAt: v.optional(v.float64()),
})
  .index("by_requester", ["requesterId", "status"])
  .index("by_addressee", ["addresseeId", "status"])
  .index("by_pair", ["requesterId", "addresseeId"]);

export default friendships;
