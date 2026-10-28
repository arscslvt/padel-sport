import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { serverMutation } from "../functions";
import {
  courtsAt,
  MATCH_DURATION_MINUTES,
  MAX_PLAYERS,
  normalizePhone,
  pickCourts,
  SLOT_INTERVAL_MS,
} from "../modules/openMatches/lib";
import { matchPricing } from "../modules/pricing/lib";
import {
  bookingSettings,
  closedReason,
  isWithinOpeningHours,
} from "../modules/settings/lib";
import { recordDeliveries } from "../modules/deliveries/lib";
import { confirmWhatsappToPlayers } from "../modules/notifications/bookingPlayers";
import { bookingChanged } from "../modules/points/auto";

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
 * Un gruppo più grande di quattro prende più campi alla stessa ora con una
 * prenotazione sola (`courts`): otto persone, due campi. I posti sono quattro
 * per campo, e ogni campo conta come occupato ovunque (`extraSlots`).
 *
 * Passa dalla route della dashboard (api/dashboard/bookings), che ha già
 * verificato che chi chiede è dello staff.
 */

/** Quanti campi può prendere un gruppo: oltre, è un evento e non una partita. */
const MAX_COURTS = 2;

const LEVEL = v.union(
  v.literal("principiante"),
  v.literal("intermedio"),
  v.literal("avanzato"),
);

/**
 * I clienti collegati ai nomi, senza doppioni e senza chi prenota (che conta
 * già come `createdByPlayer`). Al massimo quanti stanno in campo: `seats`,
 * quattro per ogni campo della prenotazione.
 */
export async function linkablePlayers(
  ctx: MutationCtx,
  ids: Id<"players">[] | undefined,
  bookerId: Id<"players"> | undefined,
  seats: number = MAX_PLAYERS,
): Promise<Id<"players">[] | undefined> {
  const unique = [...new Set(ids ?? [])].filter((id) => id !== bookerId);
  if (unique.length === 0) return undefined;
  if (unique.length > seats) {
    throw new Error(`In campo si sta in ${seats}.`);
  }

  for (const id of unique) {
    if (!(await ctx.db.get(id))) throw new Error("Cliente non trovato.");
  }
  return unique;
}

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

export default serverMutation({
  args: {
    bookingDate: v.number(),
    /** Quanti campi prende il gruppo: uno, o due per otto persone. */
    courts: v.optional(v.number()),
    /**
     * I campi scelti, tanti quanti `courts`; senza, i primi liberi come per i
     * clienti.
     */
    slotIds: v.optional(v.array(v.id("slots"))),
    /** Il cliente in anagrafica, se la prenotazione è sua. */
    playerId: v.optional(v.id("players")),
    bookedBy: v.string(),
    phone: v.optional(v.string()),
    /** I nomi in campo, quattro per campo: il primo è chi prenota. */
    players: v.array(v.string()),
    /**
     * I clienti in anagrafica fra quei nomi, scelti dalla ricerca: la partita
     * conta per loro nei premi automatici (modules/points/auto.ts).
     */
    linkedPlayerIds: v.optional(v.array(v.id("players"))),
    /**
     * Il recapito degli altri giocatori senza scheda: lo staff li può
     * contattare. Quello di chi prenota, se non è un cliente, è `phone`.
     */
    guestContacts: v.optional(
      v.array(v.object({ name: v.string(), phone: v.string() })),
    ),
    level: LEVEL,
    notify: v.boolean(),
    /** L'operatore che la prende: resta scritto nella scheda. */
    staff: v.optional(v.object({ userId: v.string(), name: v.string() })),
  },
  handler: async (ctx, args) => {
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

    const courts = args.courts ?? 1;
    if (!Number.isInteger(courts) || courts < 1 || courts > MAX_COURTS) {
      throw new Error(`Si possono prendere da 1 a ${MAX_COURTS} campi.`);
    }
    const seats = MAX_PLAYERS * courts;

    const players = args.players.map((name) => name.trim()).filter(Boolean);
    if (players.length > seats) {
      throw new Error(`Su ${courts === 1 ? "un campo" : `${courts} campi`} si sta in ${seats}.`);
    }
    if (players.length === 0) players.push(bookedBy);

    const linkedPlayerIds = await linkablePlayers(
      ctx,
      args.linkedPlayerIds,
      player?._id,
      seats,
    );

    const rawPhone = args.phone?.trim() || player?.phone;
    const phone = rawPhone ? normalizePhone(rawPhone) : undefined;

    // Un recapito vale solo per un nome che è davvero in campo.
    const contacts = (args.guestContacts ?? [])
      .map(({ name, phone }) => ({ name: name.trim(), phone: phone.trim() }))
      .filter(({ name, phone }) => phone && players.includes(name))
      .map(({ name, phone }) => ({ name, phone: normalizePhone(phone) }));
    const guestContacts = contacts.length > 0 ? contacts : undefined;

    const { free, blocked } = await courtsAt(ctx, args.bookingDate);
    if (free.length - blocked < courts) {
      throw new Error(
        courts === 1
          ? "A quell'ora non c'è un campo libero."
          : `A quell'ora non ci sono ${courts} campi liberi.`,
      );
    }

    // «Automatico» sceglie come per i clienti: i campi che non lasciano buchi.
    let slotIds: Id<"slots">[] = (
      (await pickCourts(ctx, args.bookingDate, free, courts)) ?? []
    ).map((slot) => slot._id);
    if (args.slotIds?.length) {
      const chosen = [...new Set(args.slotIds)];
      if (chosen.length !== courts) {
        throw new Error(
          courts === 1 ? "Scegli un campo." : `Scegli ${courts} campi diversi.`,
        );
      }
      if (!chosen.every((id) => free.some((slot) => slot._id === id))) {
        throw new Error("Il campo scelto è già occupato a quell'ora.");
      }
      slotIds = chosen;
    }
    const [slotId, ...extraSlots] = slotIds;
    if (!slotId) throw new Error("A quell'ora non c'è un campo libero.");

    const code = await bookingCode(ctx);

    // Il listino vale anche allo sportello: la tariffa tesserati scatta se
    // la prenotazione è collegata a un cliente con la tessera valida.
    const pricing = await matchPricing(ctx, player?._id);

    const bookingId = await ctx.db.insert("bookings", {
      clubId: ctx.club._id,
      bookedBy,
      phone,
      players,
      bookingDate: args.bookingDate,
      level: args.level,
      bookForAll: players.length >= seats,
      slot: slotId,
      extraSlots: extraSlots.length > 0 ? extraSlots : undefined,
      ...pricing,
      paymentMode: "on_site",
      status: "accepted_on_site_payment",
      createdAt: Date.now(),
      code,
      createdByPlayer: player?._id,
      linkedPlayerIds,
      guestContacts,
      source: "staff",
      createdByStaff: args.staff,
    });

    // Nasce confermata: per chi gioca può essere già una partita premiata.
    await bookingChanged(ctx, bookingId);

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

      // I clienti collegati agli altri nomi ricevono la stessa conferma: la
      // mail li trova da sé (bookingMail.ts), il WhatsApp parte per ognuno.
      const linked = await Promise.all(
        (linkedPlayerIds ?? []).map((id) => ctx.db.get(id)),
      );
      await confirmWhatsappToPlayers(
        ctx,
        bookingId,
        linked.filter((doc) => doc !== null),
      );
    }

    return { bookingId, code };
  },
});
