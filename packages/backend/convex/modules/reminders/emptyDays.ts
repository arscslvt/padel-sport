import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { staffAgendaDayUrl } from "../../utils/staffLinks";
import { bookingSettings, clubDayKey, clubMoment } from "../settings/lib";
import { windowsForDay } from "../settings/schedule";

/**
 * Il promemoria del mattino, ripetuto nel primo pomeriggio: i prossimi giorni
 * di apertura che non hanno ancora nessuna partita in agenda. Il secondo giro
 * guarda di nuovo l'agenda, quindi parte solo se nel frattempo nessuno l'ha
 * riempita, e sul telefono prende il posto del primo (stesso tag).
 *
 * Il giovedì guarda venerdì, sabato e domenica; se uno dei tre è vuoto, lo
 * staff se lo sente dire con il tempo di riempirlo. Un giorno di chiusura —
 * spento, chiuso per date o segnato su SumUp come evento di tutto il giorno —
 * vuoto lo è di proposito, e non si conta.
 *
 * Conta come partita qualunque prenotazione non annullata, dal sito,
 * dall'app o dal gestionale, e ogni occupazione presa su SumUp.
 *
 * Il cron è orario (crons.ts) e qui si guarda l'ora del club: un cron
 * giornaliero vive in UTC e scivolerebbe di un'ora a ogni cambio dell'ora
 * legale.
 */

/**
 * Le ore del club a cui parte: prima dell'apertura, con la giornata davanti,
 * e alla ripresa del pomeriggio.
 */
const REMINDER_HOURS = [9, 14];

/** Quanti giorni dopo oggi si guardano. */
const LOOKAHEAD_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** «venerdì 16» da "2026-10-16". */
function dayLabel(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, date)));
}

/** «venerdì 16, sabato 17 e domenica 18» */
function listLabel(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export default internalMutation({
  args: {
    /** Parte subito, a qualunque ora: per provarlo da `convex run`. */
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, { force }) => {
    const now = Date.now();
    const hour = Math.floor(clubMoment(now).minutes / 60);
    if (!force && !REMINDER_HOURS.includes(hour)) return { sent: false, empty: [] };

    const settings = await bookingSettings(ctx);
    const today = clubDayKey(now);
    const horizon = now + (LOOKAHEAD_DAYS + 1) * DAY_MS;

    // I giorni da guardare, con il loro giorno della settimana nell'ora del club.
    const days: { key: string; weekday: number }[] = [];
    for (let offset = 1; offset <= LOOKAHEAD_DAYS; offset++) {
      const moment = now + offset * DAY_MS;
      days.push({ key: clubDayKey(moment), weekday: clubMoment(moment).weekday });
    }

    const busy = new Set<string>();
    const closed = new Set<string>();

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_booking_date", (q) =>
        q.gt("bookingDate", now).lt("bookingDate", horizon),
      )
      .collect();
    for (const booking of bookings) {
      if (booking.status !== "cancelled") busy.add(clubDayKey(booking.bookingDate));
    }

    // Da due settimane fa: una chiusura di più giorni può essere cominciata prima.
    const external = await ctx.db
      .query("externalBookings")
      .withIndex("by_start", (q) => q.gt("start", now - 14 * DAY_MS).lt("start", horizon))
      .collect();
    for (const row of external) {
      // Un evento di tutto il giorno su SumUp è di norma una chiusura
      // (tables/externalBookings.ts), e può coprire più giorni.
      if (row.allDay) {
        for (const day of days) {
          // `end` è la mezzanotte dopo l'ultimo giorno: escluso.
          if (clubDayKey(row.start) <= day.key && day.key < clubDayKey(row.end)) {
            closed.add(day.key);
          }
        }
        continue;
      }
      busy.add(clubDayKey(row.start));
    }

    const empty = days.filter(
      (day) =>
        !busy.has(day.key) &&
        !closed.has(day.key) &&
        windowsForDay(settings, day.key, day.weekday).length > 0,
    );
    if (empty.length === 0) return { sent: false, empty: [] };

    const tomorrowOnly = empty.length === 1 && empty[0].key === days[0].key;
    const labels = empty.map((day) => dayLabel(day.key));

    await ctx.scheduler.runAfter(0, internal.modules.push.send.default, {
      category: "agenda",
      title: tomorrowOnly
        ? "Domani non ci sono ancora partite"
        : empty.length === 1
          ? `Nessuna partita per ${labels[0]}`
          : "Giorni ancora senza partite",
      body:
        empty.length === 1
          ? `L'agenda di ${labels[0]} è vuota: ricordati di caricare le partite.`
          : `${listLabel(labels)} non hanno ancora partite in agenda: ricordati di caricarle.`,
      url: staffAgendaDayUrl(empty[0].key),
      tag: `agenda:${today}`,
    });

    return { sent: true, empty: empty.map((day) => day.key) };
  },
});
