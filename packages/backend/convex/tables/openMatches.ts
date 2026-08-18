import { defineTable } from "convex/server";
import { v } from "convex/values";

const joinMode = v.union(v.literal("direct"), v.literal("request"));

const openMatchStatus = v.union(
  v.literal("open"),
  v.literal("full"),
  v.literal("cancelled"),
);

const matchVisibility = v.union(
  v.literal("public"),
  v.literal("circle"),
  v.literal("private"),
);

/**
 * Partita aperta: strato di matchmaking sopra una prenotazione reale.
 * La prenotazione collegata occupa il campo; qui vivono i giocatori,
 * il livello richiesto e la modalità di accesso.
 *
 * Ogni prenotazione fatta dall'app ha la sua partita, qualunque sia la
 * visibilità: `private` è solo una partita che non compare agli altri e in cui
 * si entra unicamente su invito, non l'assenza di una partita. È ciò che le fa
 * condividere dettaglio, cancellazione, uscita e inviti con tutte le altre.
 *
 * Con `visibility: "circle"` la partita è riservata ai membri di `circleId`.
 * Entrambi i campi sono opzionali perché le partite create prima delle cerchie
 * non li hanno: l'assenza di `visibility` vale come `"public"`. Da privata o da
 * cerchia il creatore può poi aprirla a tutti
 * (modules/openMatches/publish.ts) tenendo chi è già entrato; `circleId`
 * resta lì a dire da dove è nata.
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
  visibility: v.optional(matchVisibility),
  circleId: v.optional(v.id("circles")),
  notes: v.optional(v.string()),
  createdAt: v.float64(),
})
  .index("by_status_date", ["status", "matchDate"])
  .index("by_date", ["matchDate"])
  .index("by_booking", ["bookingId"])
  .index("by_creator", ["creatorId"])
  .index("by_circle_date", ["circleId", "matchDate"]);

export default openMatches;
export { joinMode, matchVisibility, openMatchStatus };
