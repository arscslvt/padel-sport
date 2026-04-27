import { mutation } from "../_generated/server";
import { bookingNewSchema } from "../types/bookings/booking.new.type";

const SLOT_INTERVAL_MINUTES = 30;
const MATCH_DURATION_MINUTES = 90;

const SLOT_INTERVAL_MS = SLOT_INTERVAL_MINUTES * 60 * 1000;
const MATCH_DURATION_MS = MATCH_DURATION_MINUTES * 60 * 1000;

export default mutation({
  args: {
    booking: bookingNewSchema,
  },
  handler: async (ctx, { booking }) => {
    const players = booking.players.map((name) => name.trim()).filter(Boolean);

    if (players.length === 0) {
      throw new Error("Inserisci almeno un giocatore.");
    }

    if (players.length > 4) {
      throw new Error("Puoi prenotare al massimo per 4 giocatori.");
    }

    if (booking.bookForAll && players.length !== 4) {
      throw new Error("Se prenoti per tutti, devi inserire tutti e 4 i nomi.");
    }

    const bookedBy = booking.bookedBy.trim();
    const phone = booking.phone.trim();

    if (!bookedBy) {
      throw new Error("Il nome del prenotante e obbligatorio.");
    }

    if (!phone) {
      throw new Error("Il numero di telefono e obbligatorio.");
    }

    const normalizedPhone = phone.replace(/\s+/g, "");

    if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
      throw new Error("Inserisci un numero di telefono valido.");
    }

    if (booking.bookingDate <= Date.now()) {
      throw new Error("La data e l'ora devono essere nel futuro.");
    }

    if (booking.bookingDate % SLOT_INTERVAL_MS !== 0) {
      throw new Error(
        "L'orario deve essere selezionato a scaglioni di 30 minuti.",
      );
    }

    const possibleOverlaps = await ctx.db
      .query("bookings")
      .withIndex("by_booking_date", (q) =>
        q
          .gte("bookingDate", booking.bookingDate - MATCH_DURATION_MS + 1)
          .lt("bookingDate", booking.bookingDate + MATCH_DURATION_MS),
      )
      .collect();

    const bookingEnd = booking.bookingDate + MATCH_DURATION_MS;

    const hasOverlap = possibleOverlaps.some((existingBooking) => {
      const existingStart = existingBooking.bookingDate;
      const existingEnd = existingStart + MATCH_DURATION_MS;

      return existingStart < bookingEnd && existingEnd > booking.bookingDate;
    });

    if (hasOverlap) {
      throw new Error(
        "L'orario selezionato non e disponibile. Scegli uno slot differente.",
      );
    }

    return await ctx.db.insert("bookings", {
      bookedBy,
      phone: normalizedPhone,
      players,
      bookingDate: booking.bookingDate,
      level: booking.level,
      bookForAll: booking.bookForAll,
      pricePerPlayer: 7,
      paymentMode: "on_site",
      status: "pending_on_site_payment",
      createdAt: Date.now(),
    });
  },
});
