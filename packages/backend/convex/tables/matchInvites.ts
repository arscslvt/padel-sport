import { defineTable } from "convex/server";
import { v } from "convex/values";

const matchInviteStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("cancelled"),
);

/**
 * Da dove nasce l'invito, che è anche ciò che decide se tiene occupato un posto.
 *
 * `direct` è l'invito nominale: il creatore ha chiamato quella persona, quindi
 * il posto resta suo finché non risponde e nessun altro può prenderlo.
 *
 * `circle` è la diffusione a tutti i membri di una cerchia, che può arrivare a
 * venti persone (modules/circles/lib.ts): se ognuna bloccasse un posto la
 * partita nascerebbe piena e nessuno potrebbe accettare. Qui il posto si occupa
 * solo entrando davvero.
 *
 * È un campo esplicito e non la semplice presenza di `circleId` perché è una
 * regola di prodotto, non un dettaglio di collegamento.
 */
const matchInviteKind = v.union(v.literal("direct"), v.literal("circle"));

/**
 * Invito a una partita: ne nasce uno per ogni membro della cerchia quando la
 * partita è di cerchia, e uno per ogni persona chiamata per nome dal creatore.
 * In entrambi i casi non c'è nulla da chiedere: è già tutto approvato, manca
 * solo la risposta dell'invitato.
 *
 * È il verso opposto di `joinRequests`, dove è il giocatore a chiedere di
 * entrare in una partita aperta e il creatore ad approvare.
 *
 * `kind` è opzionale perché le righe create prima degli inviti nominali non ce
 * l'hanno: erano tutte di cerchia, ed è così che vanno lette.
 */
const matchInvites = defineTable({
  matchId: v.id("openMatches"),
  circleId: v.optional(v.id("circles")),
  playerId: v.id("players"),
  kind: v.optional(matchInviteKind),
  status: matchInviteStatus,
  createdAt: v.float64(),
  respondedAt: v.optional(v.float64()),
})
  .index("by_match", ["matchId"])
  .index("by_match_player", ["matchId", "playerId"])
  .index("by_player_status", ["playerId", "status"]);

export default matchInvites;
export { matchInviteKind, matchInviteStatus };
