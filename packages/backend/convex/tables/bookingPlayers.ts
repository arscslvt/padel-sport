import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Chi, fra i clienti con una scheda, gioca in quale prenotazione.
 *
 * È un indice e non un dato nuovo: lo si ricava dalla partita
 * (`openMatches.playerIds`) o, per le prenotazioni senza partita, da chi ha
 * prenotato e dai nomi che lo staff ha collegato a una scheda
 * (`bookings.linkedPlayerIds`). Lo tiene allineato `bookingChanged`
 * (modules/points/auto.ts), a ogni cambio di squadra, stato o orario.
 *
 * Serve a rispondere in fretta a «quante partite ha giocato questa persona
 * questa settimana?» senza rileggere tutte le prenotazioni del club. Le
 * prenotazioni annullate non hanno righe.
 *
 * `confirmed` è la conferma dello staff: i premi del gioco contano solo
 * quelle. `bookingCreatedAt` dice se la prenotazione è nata prima che
 * un'azione premiata partisse (`pointRules.since`).
 */
const bookingPlayers = defineTable({
  /** Il club della riga (docs/multi-club.md). */
  clubId: v.id("clubs"),
  bookingId: v.id("bookings"),
  playerId: v.id("players"),
  bookingDate: v.float64(),
  bookingCreatedAt: v.float64(),
  confirmed: v.boolean(),
})
  .index("by_booking", ["bookingId"])
  .index("by_player", ["playerId", "bookingDate"])
  .index("by_club", ["clubId"]);

export default bookingPlayers;
