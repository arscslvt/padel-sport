import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { serverMutation, serverQuery } from "../functions";
import { recordDeliveries } from "../modules/deliveries/lib";
import { bookingChanged } from "../modules/points/auto";
import {
  courtLabel,
  courtsAt,
  courtsOf,
  joinCourtNames,
  MATCH_DURATION_MINUTES,
  pickCourts,
  SLOT_INTERVAL_MINUTES,
  SLOT_INTERVAL_MS,
} from "../modules/openMatches/lib";
import {
  bookingSettings,
  closedReason,
  clubDayKey,
  clubMoment,
  isWithinOpeningHours,
  toMinutes,
} from "../modules/settings/lib";
import { windowsForDay } from "../modules/settings/schedule";

/**
 * Lo staff sposta l'orario di una prenotazione, nello stesso giorno.
 *
 * Il giorno non si cambia da qui: un altro giorno è un'altra prenotazione, e
 * si annulla e si rifà. L'orario nuovo deve stare dentro le fasce di apertura
 * ed essere libero, contando anche gli appuntamenti di SumUp: le stesse regole
 * di una prenotazione nuova (`courtsAt`), senza contare la prenotazione stessa,
 * che altrimenti occuperebbe il proprio campo.
 *
 * Il campo resta lo stesso se è libero anche all'orario nuovo; se no si passa
 * al primo libero, e il modulo lo dice prima di confermare. Una prenotazione
 * su più campi ne cerca altrettanti, tenendo quelli suoi ancora liberi.
 *
 * Passa dalla route della dashboard (api/dashboard/bookings/reschedule), che
 * ha già verificato con Clerk che chi chiede è dello staff.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function clubTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Perché non si può spostare, o `null` se si può. */
function moveBlocker(booking: Doc<"bookings">, now: number): string | null {
  if (booking.status === "cancelled") {
    return "La prenotazione è stata annullata.";
  }
  if (booking.mergedWith) {
    return "Il campo è condiviso con un'altra prenotazione. Separale per cambiare orario.";
  }
  if (booking.bookingDate <= now) {
    return "La partita è già iniziata.";
  }
  return null;
}

/**
 * I campi che toccherebbero all'orario nuovo, tanti quanti ne occupa: gli
 * stessi, se sono liberi, perché chi ha prenotato se li aspetta. Per quelli
 * che mancano, i liberi che lasciano meno buchi. `null` se non bastano.
 */
async function courtsFor(
  ctx: QueryCtx,
  booking: Doc<"bookings">,
  start: number,
): Promise<Doc<"slots">[] | null> {
  const mine = courtsOf(booking);
  const { free, blocked } = await courtsAt(ctx, start, [booking._id]);
  if (free.length - blocked < mine.length) return null;

  const kept = free.filter((slot) => mine.includes(slot._id));
  const others = free.filter((slot) => !mine.includes(slot._id));
  const added = await pickCourts(
    ctx,
    start,
    others,
    mine.length - kept.length,
    [booking._id],
  );
  return added ? [...kept, ...added] : null;
}

/** I campi come li legge una persona, quando non sono più quelli di adesso. */
function changedCourts(
  booking: Doc<"bookings">,
  courts: Doc<"slots">[] | null,
): string | undefined {
  if (!courts) return undefined;
  const mine = courtsOf(booking);
  if (courts.every((court) => mine.includes(court._id))) return undefined;
  return joinCourtNames(courts.map((court) => court.name));
}

export const options = serverQuery({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");

    const now = Date.now();
    const blocker = moveBlocker(booking, now);
    const current = clubMoment(booking.bookingDate);
    const currentCourt = await courtLabel(ctx, booking);

    if (blocker) {
      return { blocker, current: booking.bookingDate, times: [] };
    }

    // Gli orari di inizio della giornata, a scaglioni come quelli del sito:
    // ogni fascia di apertura, finché la partita ci sta dentro per intero.
    // In un giorno chiuso non ci sono orari da proporre.
    const settings = await bookingSettings(ctx);
    const starts = windowsForDay(
      settings,
      clubDayKey(booking.bookingDate),
      current.weekday,
    )
      .flatMap((window) => {
        const minutes: number[] = [];
        for (
          let minute = toMinutes(window.start);
          minute + MATCH_DURATION_MINUTES <= toMinutes(window.end);
          minute += SLOT_INTERVAL_MINUTES
        ) {
          minutes.push(minute);
        }
        return minutes;
      })
      .sort((a, b) => a - b);

    const times = await Promise.all(
      [...new Set(starts)].map(async (minute) => {
        const start = booking.bookingDate + (minute - current.minutes) * 60_000;
        const isCurrent = start === booking.bookingDate;
        const courts =
          isCurrent || start <= now
            ? null
            : await courtsFor(ctx, booking, start);

        return {
          start,
          time: clubTime(minute),
          current: isCurrent,
          available: !isCurrent && courts !== null,
          /** I campi che toccherebbero, quando non sono quelli di adesso. */
          court: changedCourts(booking, courts),
        };
      }),
    );

    return {
      blocker: null,
      current: booking.bookingDate,
      currentCourt,
      // Gli orari già passati non si propongono: non sono una scelta.
      times: times.filter((time) => time.current || time.start > now),
    };
  },
});

export const move = serverMutation({
  args: {
    bookingId: v.id("bookings"),
    bookingDate: v.number(),
    /** La spunta «Avvisa il cliente via email». */
    notify: v.boolean(),
  },
  handler: async (ctx, { bookingId, bookingDate, notify }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");

    const now = Date.now();
    const blocker = moveBlocker(booking, now);
    if (blocker) throw new Error(blocker);

    if (bookingDate === booking.bookingDate) {
      throw new Error("Scegli un orario diverso da quello attuale.");
    }
    if (bookingDate % SLOT_INTERVAL_MS !== 0) {
      throw new Error("Scegli uno degli orari proposti.");
    }
    if (bookingDate <= now) {
      throw new Error("Questo orario è già passato.");
    }

    const before = clubMoment(booking.bookingDate);
    const after = clubMoment(bookingDate);
    if (
      before.weekday !== after.weekday ||
      Math.abs(bookingDate - booking.bookingDate) >= DAY_MS
    ) {
      throw new Error(
        "Puoi cambiare solo l'orario. Per un altro giorno, annulla la prenotazione e creane una nuova.",
      );
    }

    const settings = await bookingSettings(ctx);
    const closed = closedReason(settings, bookingDate);
    if (closed) throw new Error(closed);
    if (!isWithinOpeningHours(settings, bookingDate, MATCH_DURATION_MINUTES)) {
      throw new Error("La struttura è chiusa a quest'ora.");
    }

    const courts = await courtsFor(ctx, booking, bookingDate);
    const [court, ...extra] = courts ?? [];
    if (!court) {
      throw new Error(
        "Questo orario non è più disponibile. Scegline un altro.",
      );
    }

    const previous = booking.bookingDate;
    await ctx.db.patch(bookingId, {
      bookingDate,
      slot: court._id,
      extraSlots: extra.length > 0 ? extra.map((slot) => slot._id) : undefined,
    });

    // La partita dell'app porta la sua data: senza, l'app mostrerebbe ancora
    // l'orario vecchio.
    const match = await ctx.db
      .query("openMatches")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .first();
    if (match) await ctx.db.patch(match._id, { matchDate: bookingDate });

    await bookingChanged(ctx, bookingId);

    // Il vecchio orario torna libero su SumUp, il nuovo si occupa.
    await ctx.scheduler.runAfter(
      0,
      internal.modules.courtCalendar.push.move,
      { bookingId },
    );

    if (notify) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.bookingMail.default,
        { bookingId, kind: "rescheduled", previousStart: previous },
      );
    } else {
      // Anche un avviso non mandato va scritto: nella scheda deve leggersi che
      // è stata una scelta, non sembrare una mail persa.
      await recordDeliveries(ctx, bookingId, "rescheduled", "email", [
        {
          role: "booker",
          status: "skipped",
          detail: "Non avvisato per scelta dell'operatore",
        },
      ]);
    }

    return {
      bookingDate,
      court: joinCourtNames((courts ?? []).map((slot) => slot.name)),
      previous,
    };
  },
});

export type RescheduleOptions = {
  blocker: string | null;
  current: number;
  currentCourt?: string;
  times: {
    start: number;
    time: string;
    current: boolean;
    available: boolean;
    court?: string;
  }[];
};
