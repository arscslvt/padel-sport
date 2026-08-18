import { defineTable } from "convex/server";
import { v } from "convex/values";

const matchInviteStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("cancelled"),
);

/**
 * Invito a una partita di cerchia: ne nasce uno per ogni membro nel momento in
 * cui la partita viene creata, quindi qui non c'è nulla da chiedere: è già
 * tutto approvato, manca solo la risposta dell'invitato.
 *
 * È il verso opposto di `joinRequests`, dove è il giocatore a chiedere di
 * entrare in una partita aperta e il creatore ad approvare.
 */
const matchInvites = defineTable({
  matchId: v.id("openMatches"),
  circleId: v.id("circles"),
  playerId: v.id("players"),
  status: matchInviteStatus,
  createdAt: v.float64(),
  respondedAt: v.optional(v.float64()),
})
  .index("by_match", ["matchId"])
  .index("by_match_player", ["matchId", "playerId"])
  .index("by_player_status", ["playerId", "status"]);

export default matchInvites;
export { matchInviteStatus };
