import { defineTable } from "convex/server";
import { v } from "convex/values";

/** Come è stata incassata la quota: sono i due modi in cui incassa il club. */
const paymentMethod = v.union(v.literal("cash"), v.literal("pos"));

/**
 * Una tessera annuale, cioè un anno di iscrizione al club.
 *
 * È una tabella e non un campo sul giocatore perché il rinnovo è un fatto
 * nuovo, non la correzione del precedente: tenendo una riga per anno il club
 * conserva lo storico dei pagamenti — chi ha pagato quando e come — che con un
 * campo solo verrebbe sovrascritto ogni dodici mesi.
 *
 * La tessera in corso è quella con `endsAt` più lontano (modules/clients/lib.ts):
 * un rinnovo anticipato non deve far risultare scaduto chi ha appena pagato.
 */
const memberships = defineTable({
  playerId: v.id("players"),
  startsAt: v.float64(),
  endsAt: v.float64(),
  /** Iscrizione saldata: finché è falsa la tessera esiste ma non copre. */
  paid: v.boolean(),
  paidAt: v.optional(v.float64()),
  method: v.optional(paymentMethod),
  amount: v.optional(v.float64()),
  note: v.optional(v.string()),
  createdAt: v.float64(),
})
  .index("by_player", ["playerId"])
  .index("by_end", ["endsAt"]);

export default memberships;
export { paymentMethod };
