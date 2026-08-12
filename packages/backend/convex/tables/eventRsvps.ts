import { defineTable } from "convex/server";
import { v } from "convex/values";

const eventRsvpStatus = v.union(
  /** Iscrizione valida, occupa posti */
  v.literal("confirmed"),
  /** Ritirata dalla segreteria: resta a storico ma libera i posti */
  v.literal("cancelled"),
);

/**
 * Iscrizione a un evento, raccolta dal blocco «Modulo di iscrizione» che
 * l'editor può inserire nel corpo dell'articolo da Sanity Studio.
 *
 * I dati stanno qui e non su Sanity di proposito: il dataset `production` è
 * pubblico (aclMode "public"), quindi un documento Sanity con nome e email
 * sarebbe leggibile da chiunque conosca il projectId — che è nel bundle.
 *
 * La coppia `eventId` + `blockKey` identifica il singolo modulo: `eventId` è
 * l'`_id` del documento Sanity (stabile anche se cambia lo slug), `blockKey`
 * il `_key` del blocco, così un evento può ospitare più moduli distinti.
 */
const eventRsvps = defineTable({
  /** `_id` del documento Sanity, senza il prefisso `drafts.` */
  eventId: v.string(),
  /** `_key` del blocco `rsvpForm` dentro il corpo dell'articolo */
  blockKey: v.string(),
  /** Slug e titolo al momento dell'iscrizione: solo per leggerli senza interrogare Sanity */
  eventSlug: v.string(),
  eventTitle: v.string(),
  name: v.string(),
  email: v.string(),
  /** Accompagnatori oltre all'iscritto: i posti occupati sono `guests + 1` */
  guests: v.float64(),
  status: eventRsvpStatus,
  /**
   * Credenziale del link «annulla l'iscrizione» che finisce nella mail di
   * conferma. È un UUID v4 generato dalla route: 122 bit di entropia, quindi
   * indovinarlo non è una strada, e revocarlo vuol dire cambiare una riga.
   */
  cancelToken: v.string(),
  cancelledAt: v.optional(v.float64()),
  /** Esito dell'invio delle mail: l'iscrizione resta valida anche se fallisce */
  notifiedAt: v.optional(v.float64()),
  createdAt: v.float64(),
})
  .index("by_form", ["eventId", "blockKey"])
  .index("by_email", ["email"])
  .index("by_cancel_token", ["cancelToken"]);

export default eventRsvps;
export { eventRsvpStatus };
