import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Cosa è successo alla prenotazione, e quindi quale avviso è partito. Il QR
 * viaggia solo con `accepted` (modules/notifications/bookingMail.ts).
 */
const notificationKind = v.union(
  v.literal("accepted"),
  v.literal("merged"),
  v.literal("cancelled_by_club"),
  v.literal("cancelled_by_player"),
  /** Lo staff ha spostato l'orario (bookings/reschedule.ts). */
  v.literal("rescheduled"),
  /**
   * L'invito alla partita, a chi è stato chiamato per nome da chi ha
   * prenotato dall'area personale (modules/notifications/matchInvite.ts).
   */
  v.literal("invited"),
);

const deliveryChannel = v.union(v.literal("email"), v.literal("whatsapp"));

/**
 * A chi è andato l'avviso: chi ha prenotato, un giocatore vero (un cliente in
 * anagrafica collegato alla prenotazione, o in partita dall'app), oppure un
 * compagno di gioco che ha lasciato solo nome e mail.
 */
const deliveryRole = v.union(
  v.literal("booker"),
  v.literal("player"),
  v.literal("guest"),
);

/**
 * A che punto è un avviso, dal più acerbo al più maturo.
 *
 * Gli stati arrivano dai webhook di Resend e Twilio, e arrivano in disordine:
 * un «consegnato» può precedere il suo «inviato». L'ordine qui sotto è quello
 * con cui uno stato può prendere il posto di un altro (modules/deliveries/lib.ts):
 * mai all'indietro.
 */
const deliveryStatus = v.union(
  /** Non tentato: manca il recapito, o chi ha confermato ha scelto di non mandarlo */
  v.literal("skipped"),
  /** Accettato dal provider, non ancora partito */
  v.literal("queued"),
  /** Partito verso il destinatario */
  v.literal("sent"),
  /** Email: il server di posta ha rimandato, Resend ci riprova */
  v.literal("delayed"),
  /** Arrivato nella casella o sul telefono */
  v.literal("delivered"),
  /** WhatsApp: aperto dal cliente */
  v.literal("read"),
  /** Email: arrivata, ma il cliente l'ha segnata come spam */
  v.literal("complained"),
  /** Rifiutato, rimbalzato o non consegnabile: il cliente non l'ha ricevuto */
  v.literal("failed"),
);

/**
 * Un avviso al cliente su una prenotazione: una riga per canale e destinatario.
 *
 * Risponde alla domanda che lo staff si fa davanti a una conferma: *il cliente
 * lo sa?* Senza queste righe la risposta era «la mail è partita», che vuol
 * dire solo che Resend l'ha presa in carico — non che è arrivata, né che il
 * numero era su WhatsApp.
 *
 * La riga nasce quando l'avviso viene tentato (o deliberatamente saltato) e
 * matura con i webhook: `providerId` è l'id dell'email su Resend o il SID del
 * messaggio su Twilio, ed è così che un evento ritrova la sua riga.
 */
const bookingDeliveries = defineTable({
  /** Il club della riga (docs/multi-club.md). Opzionale fino alla Fase 3. */
  clubId: v.optional(v.id("clubs")),
  bookingId: v.id("bookings"),
  kind: notificationKind,
  channel: deliveryChannel,
  role: deliveryRole,
  /** Con `player`: la scheda del giocatore avvisato. */
  playerId: v.optional(v.id("players")),
  /** Il nome di chi è stato avvisato, se non è chi ha prenotato. */
  name: v.optional(v.string()),
  /** L'indirizzo o il numero del momento: se cambia in anagrafica, lo storico resta vero */
  recipient: v.optional(v.string()),
  status: deliveryStatus,
  /** Il perché, in italiano, quando c'è qualcosa da spiegare */
  detail: v.optional(v.string()),
  providerId: v.optional(v.string()),
  createdAt: v.float64(),
  updatedAt: v.float64(),
})
  .index("by_booking", ["bookingId"])
  .index("by_provider_id", ["providerId"])
  .index("by_club", ["clubId"]);

export default bookingDeliveries;
/** Un tentativo come lo scrive chi l'ha fatto (modules/deliveries/record.ts). */
const deliveryEntry = v.object({
  role: deliveryRole,
  playerId: v.optional(v.id("players")),
  name: v.optional(v.string()),
  recipient: v.optional(v.string()),
  status: deliveryStatus,
  detail: v.optional(v.string()),
  providerId: v.optional(v.string()),
});

export {
  deliveryChannel,
  deliveryEntry,
  deliveryRole,
  deliveryStatus,
  notificationKind,
};
