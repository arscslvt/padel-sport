import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Una comunicazione arrivata a un iscritto: una riga per casella raggiunta.
 *
 * Serve a rispondere a una domanda sola, ma quella conta: *chi non l'ha ancora
 * ricevuta?* Senza queste righe l'unica scelta davanti a un nuovo iscritto
 * sarebbe rimandare la mail a tutti — e chi l'aveva già letta se la ritrova
 * due volte.
 *
 * Si scrive solo dopo che Resend ha accettato il blocco: una riga qui dentro
 * significa «partita», non «provata». Un blocco fallito non lascia traccia, e
 * i suoi destinatari restano fra i mancanti, pronti per il tentativo dopo.
 *
 * Sta in una tabella a parte e non in un array dentro `eventCommunications`
 * perché la lista cresce a ogni invio successivo e va incrociata con
 * `eventRsvps`: un indice fa quel lavoro, un campo array no.
 */
const eventCommunicationDeliveries = defineTable({
  /** L'invio che ha prodotto questa consegna */
  communicationId: v.id("eventCommunications"),
  /** `_id` del documento Sanity e `_key` del modulo: la coppia di `eventCommunications` */
  documentId: v.string(),
  blockKey: v.string(),
  /** L'iscrizione raggiunta: è l'identità che conta, l'indirizzo può ripetersi fra moduli */
  rsvpId: v.id("eventRsvps"),
  /** Copia dell'indirizzo del momento: se l'iscrizione sparisce, lo storico resta leggibile */
  email: v.string(),
  sentAt: v.float64(),
})
  // L'unico indice che serve, ed è quello della domanda: le consegne di una
  // comunicazione a un modulo. Da quelle righe si ricava sia chi manca sia chi
  // ha già la sua riga e non va scritto due volte.
  .index("by_document", ["documentId", "blockKey"]);

export default eventCommunicationDeliveries;
