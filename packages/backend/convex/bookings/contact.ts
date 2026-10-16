import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { normalizePhone } from "../modules/openMatches/lib";
import { assertServer } from "../utils/serverSecret";
import { setBookerPhone } from "./whatsapp";

/**
 * Il numero di chi ha prenotato, scritto o corretto dallo staff dalla scheda
 * della prenotazione.
 *
 * Sulla prenotazione il numero è una copia, presa quando è nata: è quello che
 * chiama il tasto «Chiama» e a cui parte il WhatsApp di conferma. Vale solo
 * qui: la scheda cliente non cambia. Salvarlo non manda niente: per quello
 * c'è il reinvio fra gli avvisi (bookings/whatsapp.ts), che usa lo stesso
 * numero.
 *
 * Passa dalla route della dashboard (api/dashboard/bookings/phone).
 */
export const updatePhone = mutation({
  args: { secret: v.string(), bookingId: v.id("bookings"), phone: v.string() },
  handler: async (ctx, { secret, bookingId, phone: rawPhone }) => {
    assertServer(secret);

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");
    if (booking.status === "cancelled") {
      throw new Error("La prenotazione è stata annullata.");
    }

    const phone = normalizePhone(rawPhone);
    await setBookerPhone(ctx, booking, phone);

    return { phone };
  },
});
