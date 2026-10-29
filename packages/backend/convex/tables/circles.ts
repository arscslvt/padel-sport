import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Cerchia: un gruppo ristretto di giocatori dentro cui organizzare partite
 * private, separato dalla cerchia generale delle amicizie.
 *
 * I membri non stanno in un array qui ma nella tabella `circleMembers`:
 * serve poter interrogare "in quali cerchie sta questo giocatore" per
 * applicare il limite di tre cerchie a testa, e su un array non si indicizza.
 */
const circles = defineTable({
  /** Il club della riga (docs/multi-club.md). */
  clubId: v.id("clubs"),
  name: v.string(),
  ownerId: v.id("players"),
  createdAt: v.float64(),
})
  .index("by_owner", ["ownerId"])
  .index("by_club", ["clubId"]);

export default circles;
