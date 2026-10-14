import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import {
  courtsAt,
  MATCH_DURATION_MINUTES,
  MAX_PLAYERS,
  normalizePhone,
  pickCourt,
  SLOT_INTERVAL_MS,
} from "../modules/openMatches/lib";
import { matchPricing } from "../modules/pricing/lib";
import {
  bookingSettings,
  closedReason,
  isWithinOpeningHours,
} from "../modules/settings/lib";
import { recordDeliveries } from "../modules/deliveries/lib";
import { assertServer } from "../utils/serverSecret";

/**
 * Una prenotazione presa dallo staff: al telefono, allo sportello, a voce.
 *
 * Occupa un campo vero come quelle del sito e dell'app, con la stessa regola
 * di disponibilità (`courtsAt`, che conta anche gli appuntamenti di SumUp) e
 * gli stessi orari di apertura. Altre regole invece sono del cliente e non
 * dello staff, e qui non valgono: quanti giorni prima si può prenotare, la
 * tessera obbligatoria, la squadra al completo. Chi prenota per conto del club
 * sa già cosa sta facendo.
 *
 * Nasce confermata: è il club a prenderla, non c'è nessuno a cui chiedere il
 * permesso. Se è collegata a un cliente compare fra le sue prenotazioni sul
 * sito e nell'app, con codice e QR. L'avviso — mail con il QR, WhatsApp — è
 * una scelta di chi la prende, come quando si accetta una prenotazione.
 *
 * Passa dalla route della dashboard (api/dashboard/bookings), che ha già
 * verificato che chi chiede è dello staff.
 */

const LEVEL = v.union(
  v.literal("principiante"),
  v.literal("intermedio"),
  v.literal("avanzato"),
);

/** Il codice di sei caratteri che sta nel QR. Alla collisione si riprova. */
async function bookingCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (code.length < 6) continue;

    const taken = await ctx.db
      .query("bookings")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!taken) return code;
  }
  throw new Error("Non è stato possibile generare il codice. Riprova.");
}

export default mutation({
  args: {
    secret: v.string(),
    bookingDate: v.number(),
    /** Il campo scelto; senza, il primo libero come per i clienti. */
    slotId: v.optional(v.id("slots")),
    /** Il cliente in anagrafica, se la prenotazione è sua. */
    playerId: v.optional(v.id("players")),
    bookedBy: v.string(),
    phone: v.optional(v.string()),
    /** I nomi in campo: il primo è chi prenota. */
    players: v.array(v.string()),
    level: LEVEL,
    notify: v.boolean(),
    /** L'operatore che la prende: resta scritto nella scheda. */
    staff: v.optional(v.object({ userId: v.string(), name: v.string() })),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    if (args.bookingDate <= Date.now()) {
      throw new Error("La data e l'ora devono essere nel futuro.");
    }

    if (args.bookingDate % SLOT_INTERVAL_MS !== 0) {
      throw new Error("L'orario va scelto a scaglioni di 30 minuti.");
    }

    const settings = await bookingSettings(ctx);
    const closed = closedReason(settings, args.bookingDate);
    if (closed) throw new Error(closed);
    if (
      !isWithinOpeningHours(settings, args.bookingDate, MATCH_DURATION_MINUTES)
    ) {
      throw new Error("La struttura è chiusa nell'orario scelto.");
    }

    const player = args.playerId ? await ctx.db.get(args.playerId) : null;
    if (args.playerId && !player) throw new Error("Cliente non trovato.");

    const bookedBy = args.bookedBy.trim() || player?.name || "";
    if (bookedBy.length < 2) {
      throw new Error("Scrivi il nome di chi prenota.");
    }

    const players = args.players
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, MAX_PLAYERS);
    if (players.length === 0) players.push(bookedBy);

    const rawPhone = args.phone?.trim() || player?.phone;
    const phone = rawPhone ? normalizePhone(rawPhone) : undefined;

    const { free, blocked } = await courtsAt(ctx, args.bookingDate);
    if (free.length - blocked <= 0) {
      throw new Error("A quell'ora non c'è un campo libero.");
    }

    // «Automatico» sceglie come per i clienti: il campo che non lascia buchi.
    let slotId: Id<"slots"> = (
      (await pickCourt(ctx, args.bookingDate, free)) ?? free[0]
    )._id;
    if (args.slotId) {
      if (!free.some((slot) => slot._id === args.slotId)) {
        throw new Error("Il campo scelto è già occupato a quell'ora.");
      }
      slotId = args.slotId;
    }

    const code = await bookingCode(ctx);

    // Il listino vale anche allo sportello: la tariffa tesserati scatta se
    // la prenotazione è collegata a un cliente con la tessera valida.
    const pricing = await matchPricing(ctx, player?._id);

    const bookingId = await ctx.db.insert("bookings", {
      bookedBy,
      phone,
      players,
      bookingDate: args.bookingDate,
      level: args.level,
      bookForAll: players.length >= MAX_PLAYERS,
      slot: slotId,
      ...pricing,
      paymentMode: "on_site",
      status: "accepted_on_site_payment",
      createdAt: Date.now(),
      code,
      createdByPlayer: player?._id,
      source: "staff",
      createdByStaff: args.staff,
    });

    // Senza l'evento sul calendario condiviso, su SumUp quel campo resterebbe
    // prenotabile.
    await ctx.scheduler.runAfter(
      0,
      internal.modules.courtCalendar.push.default,
      { bookingId },
    );

    if (args.notify) {
      // La mail porta il QR: parte se il cliente ha un indirizzo, sull'account
      // o in anagrafica (bookingMail.ts lo risolve).
      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.bookingMail.default,
        { bookingId, kind: "accepted" },
      );

      if (phone) {
        await ctx.scheduler.runAfter(
          2000,
          internal.modules.notifications.confirmation
            .sendConfirmationWithWhatsapp,
          { bookingId },
        );
      } else {
        await recordDeliveries(ctx, bookingId, "accepted", "whatsapp", [
          {
            role: "booker",
            status: "skipped",
            detail: "Nessun numero di telefono",
          },
        ]);
      }
    }

    return { bookingId, code };
  },
});
