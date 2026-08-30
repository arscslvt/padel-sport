import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { clubDay, clubTimeOfDay } from "../../utils/clubTime";
import { externalBlocksBetween } from "../courtCalendar/lib";
import { MATCH_DURATION_MS, SLOT_INTERVAL_MS } from "../openMatches/lib";
import { bookingSettings, isWithinOpeningHours } from "../settings/lib";

/**
 * Quali campi restano liberi domani, e a che ora.
 *
 * Ricalcola quello che `findAvailableSlot` fa per un singolo orario, ma per
 * l'intera giornata e per tutti i campi invece che per il primo libero: quella
 * risponde «si può prenotare?», questa deve dire *cosa* è rimasto.
 *
 * Le prenotazioni si leggono una volta sola e il resto è calcolo in memoria.
 * Interrogare il database per ognuna delle quarantotto mezz'ore di una giornata
 * sarebbe stato più lineare da leggere e una pessima idea da eseguire.
 *
 * «Domani» è il giorno di calendario del club, non «fra ventiquattr'ore»: si
 * cammina su una finestra larga due giorni e si tiene solo ciò che cade nel
 * giorno giusto. Fare i conti sui confini di mezzanotte con l'ora legale di
 * mezzo è il modo più affidabile di sbagliarli.
 */

/** Quante fasce elencare per campo prima di troncare: una voce deve restare leggibile. */
const MAX_TIMES_PER_COURT = 4;

export interface CourtAvailability {
  court: string;
  times: string[];
}

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function freeSlotsTomorrow(
  ctx: QueryCtx,
  now: number = Date.now(),
): Promise<CourtAvailability[]> {
  const settings = await bookingSettings(ctx);
  const tomorrow = clubDay(now + 24 * 60 * 60 * 1000);

  const courts = (await ctx.db.query("slots").collect())
    .filter((slot) => slot.active)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (courts.length === 0) return [];

  // Una finestra abbondante attorno a domani: si filtra dopo sul giorno del
  // club, così i confini li decide `clubDay` e non l'aritmetica.
  const from = now;
  const to = now + 3 * 24 * 60 * 60 * 1000;

  const bookings = (
    await ctx.db
      .query("bookings")
      .withIndex("by_booking_date", (q) =>
        q.gte("bookingDate", from - MATCH_DURATION_MS).lte("bookingDate", to),
      )
      .collect()
  ).filter((booking) => booking.status !== "cancelled");

  const blocks = await externalBlocksBetween(ctx, from, to);

  const free = new Map<string, string[]>();

  // Si parte da una mezz'ora tonda e non da «adesso»: le fasce prenotabili
  // cadono alle e zero e alle e mezza, e partire da un istante qualunque
  // produrrebbe un elenco di orari come «09:16, 09:46» che non corrisponde a
  // niente di prenotabile.
  const firstSlot = Math.ceil(from / SLOT_INTERVAL_MS) * SLOT_INTERVAL_MS;

  for (let start = firstSlot; start <= to; start += SLOT_INTERVAL_MS) {
    if (clubDay(start) !== tomorrow) continue;
    if (start <= now) continue;

    // La durata la chiede in minuti, non in millisecondi.
    if (!isWithinOpeningHours(settings, start, MATCH_DURATION_MS / 60000)) {
      continue;
    }

    const end = start + MATCH_DURATION_MS;

    const taken = (court: Doc<"slots">) =>
      bookings.some((booking) => {
        if (
          !overlaps(
            booking.bookingDate,
            booking.bookingDate + MATCH_DURATION_MS,
            start,
            end,
          )
        ) {
          return false;
        }

        // Una prenotazione senza campo è delle più vecchie e li blocca tutti:
        // è la stessa semantica prudente di `bookings/availability.ts`.
        return !booking.slot || booking.slot === court._id;
      });

    const available = courts.filter((court) => !taken(court));

    // Le occupazioni esterne non dicono *quale* campo prendono, quindi ognuna
    // ne toglie uno dal totale — prudente, come in `findAvailableSlot`.
    const external = blocks.filter((block) =>
      overlaps(block.start, block.end, start, end),
    ).length;

    for (const court of available.slice(
      0,
      Math.max(available.length - external, 0),
    )) {
      const times = free.get(court.name) ?? [];
      times.push(clubTimeOfDay(start));
      free.set(court.name, times);
    }
  }

  return [...free.entries()]
    .map(([court, times]) => ({
      court,
      times:
        times.length > MAX_TIMES_PER_COURT
          ? [...times.slice(0, MAX_TIMES_PER_COURT), "…"]
          : times,
    }))
    .sort((a, b) => a.court.localeCompare(b.court));
}
