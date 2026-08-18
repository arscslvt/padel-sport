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
  name: v.string(),
  ownerId: v.id("players"),
  createdAt: v.float64(),
}).index("by_owner", ["ownerId"]);

export default circles;
