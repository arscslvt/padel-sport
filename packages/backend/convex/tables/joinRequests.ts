import { defineTable } from "convex/server";
import { v } from "convex/values";

const joinRequestStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("cancelled"),
);

/** Richiesta di partecipazione a una partita aperta in modalità "request". */
const joinRequests = defineTable({
  matchId: v.id("openMatches"),
  playerId: v.id("players"),
  status: joinRequestStatus,
  createdAt: v.float64(),
})
  .index("by_match_status", ["matchId", "status"])
  .index("by_match_player", ["matchId", "playerId"])
  .index("by_player", ["playerId", "status"]);

export default joinRequests;
export { joinRequestStatus };
