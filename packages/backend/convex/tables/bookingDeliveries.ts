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
);

const deliveryChannel = v.union(v.literal("email"), v.literal("whatsapp"));

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
  bookingId: v.id("bookings"),
  kind: notificationKind,
  channel: deliveryChannel,
  /** Chi ha prenotato o un compagno di gioco che ha lasciato la mail */
  role: v.union(v.literal("booker"), v.literal("guest")),
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
  .index("by_provider_id", ["providerId"]);

export default bookingDeliveries;
export { deliveryChannel, deliveryStatus, notificationKind };
