import { defineTable } from "convex/server";
import { v } from "convex/values";

const joinMode = v.union(v.literal("direct"), v.literal("request"));

const openMatchStatus = v.union(
  v.literal("open"),
  v.literal("full"),
  v.literal("cancelled"),
);

/**
 * Partita aperta: strato di matchmaking sopra una prenotazione reale.
 * La prenotazione collegata occupa il campo; qui vivono i giocatori,
 * il livello richiesto e la modalità di accesso.
 */
const openMatches = defineTable({
  bookingId: v.id("bookings"),
  creatorId: v.id("players"),
  /** Giocatori in partita, creatore incluso */
  playerIds: v.array(v.id("players")),
  maxPlayers: v.float64(),
  /** Duplicato di bookings.bookingDate per interrogare senza join */
  matchDate: v.float64(),
  levelMin: v.float64(),
  levelMax: v.float64(),
  joinMode,
  status: openMatchStatus,
  notes: v.optional(v.string()),
  createdAt: v.float64(),
})
  .index("by_status_date", ["status", "matchDate"])
  .index("by_date", ["matchDate"])
  .index("by_booking", ["bookingId"])
  .index("by_creator", ["creatorId"]);

export default openMatches;
export { joinMode, openMatchStatus };
