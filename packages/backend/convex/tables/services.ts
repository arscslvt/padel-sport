import { defineTable } from "convex/server";
import { v } from "convex/values";

/** Cosa si prenota. Oggi solo la partita: un servizio nuovo nasce qui. */
const serviceKind = v.literal("match");

/**
 * Il listino: quanto costa ogni servizio prenotabile, una riga per servizio.
 *
 * Sta nel gestionale perché SumUp non lo espone: le sue API coprono i
 * pagamenti, non il catalogo della cassa. Questa è quindi l'unica fonte del
 * prezzo per sito, app e pagamenti online; la cassa SumUp va allineata a mano
 * quando un prezzo cambia.
 *
 * Nome e descrizione del servizio stanno nel codice (modules/pricing/lib.ts),
 * qui solo i numeri che il club muove. Una riga che manca vale il prezzo di
 * partenza.
 */
const services = defineTable({
  /** Il club della riga (docs/multi-club.md). Opzionale fino alla Fase 3. */
  clubId: v.optional(v.id("clubs")),
  kind: serviceKind,
  /** Euro a giocatore. */
  price: v.float64(),
  /**
   * Euro a giocatore per chi ha la tessera in corso e pagata. Assente: anche i
   * tesserati pagano `price`.
   */
  memberPrice: v.optional(v.float64()),
  updatedAt: v.float64(),
})
  .index("by_kind", ["kind"])
  .index("by_club_kind", ["clubId", "kind"]);

export default services;
export { serviceKind };
