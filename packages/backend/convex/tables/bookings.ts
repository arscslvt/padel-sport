import { defineTable } from "convex/server";
import { v } from "convex/values";

const notificationStatus = v.union(
  v.literal("pending"),
  v.literal("sent_with_whatsapp"),
  v.literal("failed_to_send_whatsapp"),
);

const bookings = defineTable({
  /** Il club della riga (docs/multi-club.md). */
  clubId: v.id("clubs"),
  bookedBy: v.string(),
  phone: v.optional(v.string()),
  players: v.array(v.string()),
  bookingDate: v.float64(),
  level: v.union(
    v.literal("principiante"),
    v.literal("intermedio"),
    v.literal("avanzato"),
  ),
  bookForAll: v.boolean(),
  /** Euro a giocatore, dal listino del giorno in cui si è prenotato. */
  pricePerPlayer: v.float64(),
  /**
   * Quanto paga chi prenota, quando paga diverso dagli altri: la tariffa
   * tesserati (modules/pricing/lib.ts). Assente: paga `pricePerPlayer` come
   * tutti.
   */
  bookerPricePerPlayer: v.optional(v.float64()),
  /**
   * La tariffa tesserati del listino del giorno, per i giocatori collegati
   * che hanno la tessera (`memberPlayers`). Assente: o il listino non ne
   * aveva una diversa, o la prenotazione è di prima di questo campo.
   */
  memberPricePerPlayer: v.optional(v.float64()),
  /**
   * I giocatori collegati, oltre a chi prenota, che pagano la tariffa
   * tesserati: clienti in anagrafica con la tessera valida, fotografati a
   * ogni cambio di squadra (modules/pricing/members.ts). Il nome è quello in
   * `players`, ed è così che la scheda sa chi deve quanto.
   */
  memberPlayers: v.optional(
    v.array(v.object({ playerId: v.id("players"), name: v.string() })),
  ),
  /**
   * Come si paga: in struttura, o già pagata online (tables/payments.ts).
   *
   * Gli stati qui sotto si chiamano ancora «on_site» per ragioni storiche: la
   * conferma resta dello staff anche quando il cliente ha pagato online, e
   * rinominarli vorrebbe dire migrare ogni prenotazione esistente.
   */
  paymentMode: v.union(v.literal("on_site"), v.literal("online")),
  /** Quanto è stato incassato online, in euro. Solo con `paymentMode: "online"`. */
  paidAmount: v.optional(v.float64()),
  status: v.union(
    v.literal("pending_on_site_payment"),
    v.literal("accepted_on_site_payment"),
    v.literal("cancelled"),
  ),
  notificationStatus: v.optional(
    v.union(
      v.literal("pending"),
      v.literal("sent_with_whatsapp"),
      v.literal("failed_to_send_whatsapp"),
    ),
  ),
  createdAt: v.float64(),
  slot: v.id("slots"),
  /**
   * Gli altri campi occupati alla stessa ora, quando un gruppo più grande di
   * quattro ne prende più d'uno: otto persone, due campi, una prenotazione
   * sola. I posti sono quattro per campo (modules/openMatches/lib.ts,
   * `seatsOf`). Solo lo staff le crea (bookings/staffCreate.ts); non si
   * uniscono ad altre (bookings/merge.ts).
   */
  extraSlots: v.optional(v.array(v.id("slots"))),
  code: v.optional(v.string()),
  /** Giocatore dell'app mobile che ha creato la prenotazione (assente per il web) */
  createdByPlayer: v.optional(v.id("players")),
  /**
   * Le schede dei clienti in campo, per le prenotazioni senza partita (quelle
   * dello staff): lo staff collega un nome di `players` a un cliente vero.
   * `createdByPlayer` conta anche se non è qui. Le prenotazioni con una
   * partita tengono la squadra su `openMatches.playerIds`, e questo campo non
   * lo usano. È ciò che fa contare la partita nei premi automatici
   * (modules/points/auto.ts).
   */
  linkedPlayerIds: v.optional(v.array(v.id("players"))),
  /**
   * Il recapito dei giocatori senza scheda cliente, lasciato allo staff per
   * poterli contattare. Chi ha una scheda ha il numero lì; quello di chi fa
   * da riferimento sta in `phone`. Il nome è quello in `players`: tolto il
   * nome, o collegato a un cliente, il recapito se ne va (bookings/players.ts).
   */
  guestContacts: v.optional(
    v.array(v.object({ name: v.string(), phone: v.string() })),
  ),
  /**
   * Da dove arriva: il cliente da sé, dal sito o dall'app, oppure lo staff dal
   * gestionale. Assente sulle prenotazioni più vecchie di questo campo: lì
   * l'agenda la ricava dalla partita collegata (bookings/list.ts).
   */
  source: v.optional(
    v.union(v.literal("web"), v.literal("app"), v.literal("staff")),
  ),
  /**
   * L'operatore che l'ha creata dal gestionale. Il nome è quello del momento,
   * da Clerk: la scheda deve poter dire chi è stato anche se poi lo cambia.
   */
  createdByStaff: v.optional(
    v.object({ userId: v.string(), name: v.string() }),
  ),
  /**
   * Evento corrispondente sul calendario condiviso con SumUp: è così che una
   * prenotazione fatta da noi diventa un orario occupato anche là.
   */
  externalEventId: v.optional(v.string()),
  /**
   * Gli eventi sul calendario condiviso per `extraSlots`, nello stesso ordine:
   * per SumUp ogni evento è un campo occupato.
   */
  extraExternalEventIds: v.optional(v.array(v.string())),
  /**
   * L'altra prenotazione con cui questa condivide il campo.
   *
   * Due gruppi da due che avevano preso due campi diversi alla stessa ora sono
   * quattro giocatori e un campo solo: la struttura li unisce dalla dashboard
   * (bookings/merge.ts) e il secondo campo torna prenotabile. Le prenotazioni
   * restano due — ognuna con il suo codice, il suo QR e il suo prenotante —
   * e puntano l'una all'altra: il legame è reciproco, non ha un verso.
   */
  mergedWith: v.optional(v.id("bookings")),
  /**
   * L'orario per cui lo staff ha già avuto il promemoria «fra 10 minuti»
   * (modules/reminders/starting.ts). L'orario e non un sì/no: una partita
   * spostata dopo il promemoria ne riceve un altro per l'ora nuova.
   */
  remindedStart: v.optional(v.float64()),
})
  .index("by_booking_date", ["bookingDate"])
  .index("by_created_at", ["createdAt"])
  .index("by_status", ["status"])
  .index("by_code", ["code"])
  .index("by_notification_status", ["notificationStatus"])
  .index("by_created_by_player", ["createdByPlayer", "bookingDate"])
  .index("by_club_booking_date", ["clubId", "bookingDate"])
  .index("by_club_created_at", ["clubId", "createdAt"])
  .index("by_club_status", ["clubId", "status"])
  .index("by_club_notification_status", ["clubId", "notificationStatus"]);

export default bookings;
export { notificationStatus };
