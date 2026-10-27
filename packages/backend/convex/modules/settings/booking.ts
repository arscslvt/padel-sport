import { v } from "convex/values";

import type { Doc } from "../../_generated/dataModel";
import { type MutationCtx, mutation, query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import { defaultClubId } from "../clubs/lib";
import { MATCH_DURATION_MINUTES } from "../openMatches/lib";
import {
  bookingSettings,
  clubDayKey,
  clubMoment,
  DEFAULT_SETTINGS,
  toMinutes,
} from "./lib";
import {
  type Closure,
  closureLength,
  DAY_KEY_PATTERN,
  isHourClosure,
} from "./schedule";

/**
 * Configurazione della prenotazione: quando si apre e con quali campi.
 *
 * La lettura è pubblica — sono gli orari di apertura, li deve vedere chi
 * prenota. La scrittura passa da un segreto condiviso con il sito, perché
 * Convex non sa chi è lo staff: quello lo sa Clerk, e il controllo vero sta
 * nella route che la chiama (app/api/dashboard/booking-settings). Due guardie
 * in fila, come per l'elenco degli iscritti agli eventi.
 */

const windowValidator = v.object({
  weekday: v.number(),
  start: v.string(),
  end: v.string(),
});

const TIME_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;

export const get = query({
  args: {},
  handler: async (ctx) => await bookingSettings(ctx),
});

/** I campi, anche quelli spenti: la dashboard deve poterli riaccendere. */
export const courts = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("slots").collect();

    return rows
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((slot) => ({
        id: slot._id,
        name: slot.name,
        description: slot.description,
        active: slot.active,
      }));
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    windows: v.array(windowValidator),
    bookableDays: v.number(),
    /** I giorni della settimana spenti; assente lascia quelli che ci sono. */
    closedWeekdays: v.optional(v.array(v.number())),
    membershipRequired: v.optional(v.boolean()),
    fullSquadRequired: v.optional(v.boolean()),
    onlinePaymentsEnabled: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    {
      secret,
      windows,
      bookableDays,
      closedWeekdays: closedInput,
      membershipRequired,
      fullSquadRequired,
      onlinePaymentsEnabled,
    },
  ) => {
    assertServer(secret);

    if (bookableDays < 1 || bookableDays > 60) {
      throw new Error("I giorni prenotabili devono stare fra 1 e 60.");
    }

    for (const window of windows) {
      if (window.weekday < 0 || window.weekday > 6) {
        throw new Error("Giorno della settimana non valido.");
      }

      if (!TIME_PATTERN.test(window.start) || !TIME_PATTERN.test(window.end)) {
        throw new Error(
          "Gli orari vanno indicati a scaglioni di 30 minuti, da 00:00 a 23:30.",
        );
      }

      if (window.start >= window.end) {
        throw new Error("L'apertura deve precedere la chiusura.");
      }
    }

    if (
      closedInput?.some(
        (weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6,
      )
    ) {
      throw new Error("Giorno della settimana non valido.");
    }
    const closedWeekdays = closedInput
      ? [...new Set(closedInput)].sort((a, b) => a - b)
      : undefined;

    const existing = await ctx.db.query("bookingSettings").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        windows,
        bookableDays,
        closedWeekdays: closedWeekdays ?? existing.closedWeekdays,
        membershipRequired: membershipRequired ?? existing.membershipRequired,
        fullSquadRequired: fullSquadRequired ?? existing.fullSquadRequired,
        onlinePaymentsEnabled:
          onlinePaymentsEnabled ?? existing.onlinePaymentsEnabled,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("bookingSettings", {
      clubId: await defaultClubId(ctx),
      windows,
      bookableDays,
      closedWeekdays,
      membershipRequired: membershipRequired ?? false,
      fullSquadRequired: fullSquadRequired ?? false,
      onlinePaymentsEnabled: onlinePaymentsEnabled ?? false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * La riga di configurazione, creata con i valori di partenza se ancora non
 * c'è: una chiusura si può aggiungere anche a un club che non ha mai toccato
 * gli orari.
 */
async function settingsRow(ctx: MutationCtx): Promise<Doc<"bookingSettings">> {
  const existing = await ctx.db.query("bookingSettings").first();
  if (existing) return existing;

  const { closures: _closures, ...defaults } = DEFAULT_SETTINGS;
  const id = await ctx.db.insert("bookingSettings", {
    clubId: await defaultClubId(ctx),
    ...defaults,
    updatedAt: Date.now(),
  });
  const row = await ctx.db.get(id);
  if (!row) throw new Error("Configurazione non trovata.");
  return row;
}

/** Le chiusure in corso o ancora da venire: quelle passate non servono più. */
function upcoming(closures: readonly Closure[] | undefined): Closure[] {
  const today = clubDayKey(Date.now());
  return (closures ?? []).filter((closure) => closure.to >= today);
}

const MAX_CLOSURE_DAYS = 92;
const MAX_REASON_LENGTH = 60;
const DAY_MS = 86_400_000;

/** Mezzanotte UTC di una chiave "AAAA-MM-GG". */
function utcMidnight(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date);
}

/**
 * Chiude il club in uno o più giorni di fila, tutto il giorno o solo in una
 * fascia (`start`–`end`: la pioggia, con il tempo per asciugare i campi).
 *
 * Le prenotazioni già prese restano dove sono: annullarle avvisando i clienti
 * è una scelta dello staff, non un effetto collaterale. Per questo la
 * risposta dice quante sono, e la dashboard lo racconta.
 *
 * Una chiusura di giorni interi assorbe le fasce chiuse che cadono dentro le
 * sue date: chi prima chiude il pomeriggio e poi tutta la giornata non deve
 * ritrovarsi due righe. Una fascia su un giorno già chiuso, o sopra un'altra
 * fascia, invece non si aggiunge.
 */
export const addClosure = mutation({
  args: {
    secret: v.string(),
    from: v.string(),
    to: v.string(),
    reason: v.optional(v.string()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
  },
  handler: async (ctx, { secret, from, to, reason, start, end }) => {
    assertServer(secret);

    if (!DAY_KEY_PATTERN.test(from) || !DAY_KEY_PATTERN.test(to)) {
      throw new Error("Date non valide.");
    }
    if (to < from) {
      throw new Error("L'ultimo giorno viene prima del primo.");
    }
    if (to < clubDayKey(Date.now())) {
      throw new Error("Questi giorni sono già passati.");
    }
    if (Boolean(start) !== Boolean(end)) {
      throw new Error("Una fascia chiusa ha un inizio e una fine.");
    }
    if (start && end) {
      if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
        throw new Error("Orari non validi.");
      }
      if (toMinutes(end) <= toMinutes(start)) {
        throw new Error("La fascia finisce prima di cominciare.");
      }
    }

    const closure: Closure = { from, to };
    if (closureLength(closure) > MAX_CLOSURE_DAYS) {
      throw new Error("Una chiusura dura al massimo tre mesi.");
    }
    const cleanReason = reason?.trim().slice(0, MAX_REASON_LENGTH);
    if (cleanReason) closure.reason = cleanReason;
    if (start && end) {
      closure.start = start;
      closure.end = end;
    }
    const hours = isHourClosure(closure);

    const row = await settingsRow(ctx);
    let closures = upcoming(row.closures);

    const datesOverlap = (other: Closure) =>
      other.from <= to && from <= other.to;
    const hoursOverlap = (other: Closure) =>
      !isHourClosure(other) ||
      (toMinutes(other.start ?? "00:00") < toMinutes(end ?? "24:00") &&
        toMinutes(start ?? "00:00") < toMinutes(other.end ?? "24:00"));

    if (hours) {
      if (closures.some((other) => datesOverlap(other) && hoursOverlap(other))) {
        throw new Error("Queste ore sono già chiuse.");
      }
    } else {
      if (
        closures.some((other) => !isHourClosure(other) && datesOverlap(other))
      ) {
        throw new Error("Alcuni di questi giorni sono già chiusi.");
      }
      // Le fasce chiuse dentro questi giorni non servono più.
      closures = closures.filter(
        (other) =>
          !isHourClosure(other) || other.from < from || to < other.to,
      );
    }

    await ctx.db.patch(row._id, {
      closures: [...closures, closure].sort(
        (a, b) =>
          a.from.localeCompare(b.from) ||
          (a.start ?? "").localeCompare(b.start ?? ""),
      ),
      updatedAt: Date.now(),
    });

    // Le prenotazioni attive in quei giorni (e in quelle ore). Si legge un
    // giorno in più per parte e si filtra nell'ora del club: i timestamp
    // sono in UTC.
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_booking_date", (q) =>
        q
          .gte("bookingDate", utcMidnight(from) - DAY_MS)
          .lt("bookingDate", utcMidnight(to) + 2 * DAY_MS),
      )
      .collect();

    const affected = rows.filter((booking) => {
      if (booking.status === "cancelled") return false;
      const day = clubDayKey(booking.bookingDate);
      if (day < from || to < day) return false;
      if (!start || !end) return true;
      // Una partita tocca la fascia anche solo per un pezzo.
      const { minutes } = clubMoment(booking.bookingDate);
      return (
        minutes < toMinutes(end) &&
        toMinutes(start) < minutes + MATCH_DURATION_MINUTES
      );
    }).length;

    return { affected };
  },
});

/** Riapre i giorni (o la fascia) di una chiusura. */
export const removeClosure = mutation({
  args: {
    secret: v.string(),
    from: v.string(),
    to: v.string(),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
  },
  handler: async (ctx, { secret, from, to, start, end }) => {
    assertServer(secret);

    const row = await ctx.db.query("bookingSettings").first();
    if (!row) return;

    await ctx.db.patch(row._id, {
      closures: upcoming(row.closures).filter(
        (closure) =>
          closure.from !== from ||
          closure.to !== to ||
          closure.start !== start ||
          closure.end !== end,
      ),
      updatedAt: Date.now(),
    });
  },
});

/** Ripristina gli orari storici del club. */
export const reset = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertServer(secret);

    const existing = await ctx.db.query("bookingSettings").first();
    if (existing) await ctx.db.delete(existing._id);

    return DEFAULT_SETTINGS;
  },
});

export const saveCourt = mutation({
  args: {
    secret: v.string(),
    courtId: v.optional(v.id("slots")),
    name: v.string(),
    description: v.optional(v.string()),
    active: v.boolean(),
  },
  handler: async (ctx, { secret, courtId, name, description, active }) => {
    assertServer(secret);

    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      throw new Error("Il nome del campo deve avere fra 2 e 40 caratteri.");
    }

    if (courtId) {
      await ctx.db.patch(courtId, { name: trimmed, description, active });
      return courtId;
    }

    // Il nome distingue i campi anche nel calendario e nelle mail: due uguali
    // renderebbero illeggibile ogni prenotazione.
    const taken = await ctx.db
      .query("slots")
      .withIndex("by_name", (q) => q.eq("name", trimmed))
      .first();

    if (taken) {
      throw new Error("Esiste già un campo con questo nome.");
    }

    return await ctx.db.insert("slots", {
      clubId: await defaultClubId(ctx),
      name: trimmed,
      description,
      active,
    });
  },
});
