import { defineTable } from "convex/server";
import { v } from "convex/values";

const circleRole = v.union(v.literal("owner"), v.literal("member"));

/**
 * Appartenenza di un giocatore a una cerchia, una riga per coppia.
 *
 * Il proprietario ha la sua riga come tutti gli altri (`role: "owner"`), così
 * il conteggio delle cerchie di un giocatore è una sola lettura su
 * `by_player`, che le abbia create lui o no.
 */
const circleMembers = defineTable({
  circleId: v.id("circles"),
  playerId: v.id("players"),
  role: circleRole,
  joinedAt: v.float64(),
})
  .index("by_circle", ["circleId"])
  .index("by_player", ["playerId"])
  .index("by_circle_player", ["circleId", "playerId"]);

export default circleMembers;
export { circleRole };
