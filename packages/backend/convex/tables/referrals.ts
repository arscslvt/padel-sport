import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Un amico invitato da un cliente a iscriversi al club.
 *
 * Nasce dall'area personale (`pending`): una mail all'amico con il link alla
 * pagina che gli spiega di passare in struttura e iscriversi con quella stessa
 * mail, o dando il codice amico di chi l'ha invitato. Diventa `joined` quando
 * lo staff apre la sua scheda allo sportello e la mail o il codice la
 * riconoscono (modules/referrals/lib.ts).
 *
 * I punti a chi ha invitato arrivano con la prima tessera pagata dell'amico
 * (modules/points/auto.ts, `reconcileReferral`), non con l'iscrizione: una
 * scheda aperta non è ancora un socio.
 *
 * Una persona può essere invitata una volta sola, da un solo cliente: vale il
 * primo invito. Chi arriva col codice senza essere stato invitato via mail ha
 * una riga nata già `joined`, senza mail.
 *
 * `token` è il link della mail: chi ce l'ha legge l'invito senza essere
 * autenticato, quindi lo estrae a caso il sito, come per gli inviti dello
 * staff (tables/clientInvites.ts).
 */
const referralStatus = v.union(v.literal("pending"), v.literal("joined"));

const referrals = defineTable({
  /** Il club della riga (docs/multi-club.md). */
  clubId: v.id("clubs"),
  inviterId: v.id("players"),
  /** Minuscolo: è così che lo si confronta con la scheda nuova. */
  email: v.optional(v.string()),
  /** Come chi invita ha chiamato l'amico: serve solo alla mail. */
  name: v.optional(v.string()),
  token: v.optional(v.string()),
  status: referralStatus,
  inviteeId: v.optional(v.id("players")),
  createdAt: v.float64(),
  lastSentAt: v.optional(v.float64()),
  sentCount: v.optional(v.float64()),
  joinedAt: v.optional(v.float64()),
})
  .index("by_email", ["email"])
  .index("by_token", ["token"])
  .index("by_inviter", ["inviterId", "createdAt"])
  .index("by_invitee", ["inviteeId"])
  .index("by_club_email", ["clubId", "email"]);

export default referrals;
export { referralStatus };
