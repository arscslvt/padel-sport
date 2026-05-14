import { internal } from "../_generated/api";
import { action, internalMutation, mutation } from "../_generated/server";
import { bookingNewSchema } from "../types/bookings/booking.new.type";
import { sendAlert } from "../utils/notification_client";

const SLOT_INTERVAL_MINUTES = 30;
const MATCH_DURATION_MINUTES = 90;

const SLOT_INTERVAL_MS = SLOT_INTERVAL_MINUTES * 60 * 1000;
const MATCH_DURATION_MS = MATCH_DURATION_MINUTES * 60 * 1000;

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

// export default action({
//   args: {
//     booking: bookingNewSchema,
//   },
//   handler: async (ctx, { booking }) => {
//     const response = await ctx.runMutation(
//       internal.bookings.create.newBooking,
//       { booking },
//     );

//     if (!response) {
//       console.error("Failed to create booking.");
//       return;
//     }

//     // await sendAlert({
//     //   title: "Nuova prenotazione",
//     //   message: `Nuova prenotazione da ${booking.bookedBy} per il ${new Date(
//     //     booking.bookingDate,
//     //   ).toLocaleString("it-IT")}.`,
//     //   tags: ["booking", "new"],
//     // });
//   },
// });

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
    const defaultCountryCode = "+39";

    const phoneWithCountryCode = normalizedPhone.startsWith("+")
      ? normalizedPhone
      : defaultCountryCode + normalizedPhone;

    if (!/^\+?[0-9]{8,15}$/.test(phoneWithCountryCode)) {
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

    const activeSlots = (await ctx.db.query("slots").collect())
      .filter((slot) => slot.active)
      .sort((a, b) => a.name.localeCompare(b.name));

    const possibleOverlaps = await ctx.db
      .query("bookings")
      .withIndex("by_booking_date", (q) =>
        q
          .gte("bookingDate", booking.bookingDate - MATCH_DURATION_MS + 1)
          .lt("bookingDate", booking.bookingDate + MATCH_DURATION_MS),
      )
      .collect();

    const bookingEnd = booking.bookingDate + MATCH_DURATION_MS;

    const selectedSlot = activeSlots.find((slot) => {
      return !possibleOverlaps.some((existingBooking) => {
        const existingStart = existingBooking.bookingDate;
        const existingEnd = existingStart + MATCH_DURATION_MS;

        if (
          !overlaps(existingStart, existingEnd, booking.bookingDate, bookingEnd)
        ) {
          return false;
        }

        return !existingBooking.slot || existingBooking.slot === slot._id;
      });
    });

    if (!selectedSlot) {
      throw new Error(
        "L'orario selezionato non e disponibile. Scegli uno slot differente.",
      );
    }

    // 6 cifre alfanumeriche casuali per il codice di prenotazione
    const bookingCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    // Verifica unicità del codice di prenotazione
    const existingCode = await ctx.db
      .query("bookings")
      .withIndex("by_code", (q) => q.eq("code", bookingCode))
      .first();

    if (existingCode) {
      throw new Error("Si è verificato un errore. Riprova a prenotare.");
    }

    // Inserisce la prenotazione nel database
    const insertedBooking = await ctx.db.insert("bookings", {
      bookedBy,
      phone: phoneWithCountryCode,
      players,
      bookingDate: booking.bookingDate,
      level: booking.level,
      bookForAll: booking.bookForAll,
      slot: selectedSlot._id,
      pricePerPlayer: 7,
      paymentMode: "on_site",
      status: "pending_on_site_payment",
      createdAt: Date.now(),
      code: bookingCode,
    });

    // Se per qualche motivo la prenotazione non viene inserita, lancia un errore
    if (!insertedBooking) {
      throw new Error(
        "Si è verificato un errore durante la creazione della prenotazione. Riprova.",
      );
    }

    // Notifica via ntfy (o altro canale) la nuova prenotazione
    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      {
        title: "Nuova prenotazione",
        message: `Nuova prenotazione da ${bookedBy} per il ${new Date(
          booking.bookingDate,
        ).toLocaleString("it-IT")}.`,
        tags: ["booking", "new"],
      },
    );

    // Restituisce la prenotazione appena creata
    return insertedBooking;
  },
});
