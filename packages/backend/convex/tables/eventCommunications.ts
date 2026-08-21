import { defineTable } from "convex/server";
import { v } from "convex/values";

/** Verso chi è partito un invio: l'elenco intero, o solo chi ancora non l'ha. */
const communicationAudience = v.union(
  v.literal("all"),
  v.literal("pending"),
);

const communicationStatus = v.union(
  /** Invio in corso: la riga esiste già e fa da lucchetto */
  v.literal("sending"),
  /** Invio concluso, anche se qualche destinatario ha fallito */
  v.literal("sent"),
  /** Nessuna mail è arrivata a destinazione: Resend ha rifiutato tutto */
  v.literal("failed"),
);

/**
 * Un invio di una comunicazione agli iscritti a un modulo di un evento.
 *
 * Il testo della comunicazione sta su Sanity — è contenuto editoriale, si
 * scrive nello Studio come gli articoli. Qui c'è solo *l'invio*: chi l'ha
 * fatto, quando, a quanti e com'è andata. Due ragioni per tenerlo separato:
 *
 * 1. l'elenco dei destinatari è dato personale e il dataset `production` di
 *    Sanity è pubblico (vedi `eventRsvps.ts` per la stessa scelta);
 * 2. serve transazionalità. Senza una riga che dica «questa è già partita»,
 *    un doppio clic o un retry della route manderebbe la mail due volte — e
 *    una mail non si richiama indietro.
 *
 * `eventTitle` e `subject` sono copie del momento dell'invio, non riferimenti:
 * il documento Sanity può cambiare il giorno dopo, la mail nella casella di
 * chi l'ha ricevuta no. Lo storico deve dire cosa è stato spedito davvero.
 */
const eventCommunications = defineTable({
  /** `_id` del documento Sanity, senza il prefisso `drafts.` */
  documentId: v.string(),
  /** `_id` dell'evento e `_key` del modulo destinatario: la stessa coppia di `eventRsvps` */
  eventId: v.string(),
  blockKey: v.string(),
  eventTitle: v.string(),
  subject: v.string(),
  status: communicationStatus,
  /** Destinatari a cui si è tentato l'invio, disiscritti già esclusi */
  recipients: v.float64(),
  /**
   * A chi era rivolto: tutti gli iscritti, o solo chi non l'aveva ancora
   * ricevuta. Lo storico deve saper distinguere «mandata a 40 persone» da
   * «recuperati i 3 arrivati dopo».
   */
  audience: v.optional(communicationAudience),
  /**
   * L'invio ha lasciato una riga in `eventCommunicationDeliveries` per ogni
   * destinatario raggiunto.
   *
   * Facoltativo perché nasce dopo gli invii già fatti: assente vuol dire
   * «spedita prima che esistesse il tracciamento», e per quelle righe l'unico
   * modo di sapere chi c'era è la data — chi si era iscritto prima di
   * `startedAt` l'ha ricevuta. È l'approssimazione che rende innocuo il
   * rilascio in produzione: nessuno si ritrova la mail una seconda volta.
   */
  tracked: v.optional(v.boolean()),
  delivered: v.float64(),
  failed: v.float64(),
  /** `userId` Clerk di chi ha premuto invio: un invio ha sempre un nome sopra */
  sentBy: v.string(),
  startedAt: v.float64(),
  completedAt: v.optional(v.float64()),
  /** Perché è andata male, quando è andata male */
  error: v.optional(v.string()),
})
  // La coppia è quella del lucchetto: la stessa comunicazione può essere
  // mandata a moduli diversi dello stesso evento, e restano invii distinti.
  .index("by_document", ["documentId", "blockKey"])
  .index("by_event", ["eventId"]);

export default eventCommunications;
export { communicationAudience, communicationStatus };
