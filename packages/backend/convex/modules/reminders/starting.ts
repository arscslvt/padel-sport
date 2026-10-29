import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation } from "../../functions";
import { defaultClubId } from "../clubs/lib";
import { formatClubTime } from "../../utils/clubTime";
import { staffAgendaDayUrl, staffBookingUrl } from "../../utils/staffLinks";
import { courtLabel } from "../openMatches/lib";
import { clubDayKey } from "../settings/lib";

/**
 * Il promemoria allo staff quando una partita sta per cominciare: dieci minuti
 * prima, il tempo di accendere le luci e aprire il campo.
 *
 * Gira ogni minuto (crons.ts) invece di programmare un invio per ogni
 * prenotazione: le prenotazioni nascono, si spostano, si uniscono e si
 * annullano da troppi punti diversi, e un invio programmato andrebbe
 * aggiornato in ognuno. Qui basta guardare cosa comincia fra poco.
 *
 * Un avviso per orario, non per prenotazione: due campi alle 18:30 sono una
 * notifica sola con due righe, e due gruppi uniti sullo stesso campo una riga
 * sola. Ogni prenotazione ricorda per quale orario l'ha già avuto
 * (`remindedStart`), così il minuto dopo non riparte.
 *
 * Arriva solo per le partite prese in tempo: una prenotazione fatta allo
 * sportello cinque minuti prima di giocare non ha bisogno di ricordarla a chi
 * l'ha appena scritta.
 */

const LEAD_MS = 10 * 60 * 1000;

/** Un promemoria che arriva dopo l'inizio della partita non serve a nessuno. */
const TTL_SECONDS = 10 * 60;

type Line = { court: string; names: string[]; pending: boolean };

function due(
  row: { remindedStart?: number; createdAt?: number },
  start: number,
) {
  if (row.remindedStart === start) return false;
  return row.createdAt === undefined || row.createdAt <= start - LEAD_MS;
}

export default internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Per ora gira per Padel Sport soltanto: il giro per club arriva con i
    // cron (docs/multi-club.md, Fase 2).
    const clubId = await defaultClubId(ctx);
    if (!clubId) return;

    const bookings = (
      await ctx.db
        .query("bookings")
        .withIndex("by_club_booking_date", (q) =>
          q
            .eq("clubId", clubId)
            .gt("bookingDate", now)
            .lte("bookingDate", now + LEAD_MS),
        )
        .collect()
    ).filter(
      (booking) =>
        booking.status !== "cancelled" && due(booking, booking.bookingDate),
    );

    // Quelle prese su SumUp: niente campo né giocatori, solo il titolo che ha
    // scritto chi l'ha inserita. Il loro `syncedAt` fa da data di creazione
    // solo alla prima lettura, quindi qui non si filtra su quella.
    const external = (
      await ctx.db
        .query("externalBookings")
        .withIndex("by_club_start", (q) =>
          q.eq("clubId", clubId).gt("start", now).lte("start", now + LEAD_MS),
        )
        .collect()
    ).filter((row) => !row.allDay && row.remindedStart !== row.start);

    if (bookings.length === 0 && external.length === 0) return;

    const byStart = new Map<
      number,
      { bookings: Doc<"bookings">[]; external: Doc<"externalBookings">[] }
    >();
    const group = (start: number) => {
      let entry = byStart.get(start);
      if (!entry) {
        entry = { bookings: [], external: [] };
        byStart.set(start, entry);
      }
      return entry;
    };
    for (const booking of bookings) group(booking.bookingDate).bookings.push(booking);
    for (const row of external) group(row.start).external.push(row);

    for (const [start, entry] of byStart) {
      // Per campo: due gruppi uniti stanno sulla stessa riga.
      const lines = new Map<string, Line>();
      for (const booking of entry.bookings) {
        const court = (await courtLabel(ctx, booking)) ?? "Campo";
        const line = lines.get(court) ?? { court, names: [], pending: false };
        line.names.push(booking.bookedBy);
        line.pending ||= booking.status === "pending_on_site_payment";
        lines.set(court, line);
      }

      const rows = [...lines.values()]
        .sort((a, b) => a.court.localeCompare(b.court, "it"))
        .map(
          (line) =>
            `${line.court} · ${line.names.join(" e ")}${line.pending ? " (da confermare)" : ""}`,
        );
      for (const row of entry.external) {
        rows.push(`SumUp · ${row.title?.trim() || "prenotazione"}`);
      }

      const minutes = Math.max(1, Math.ceil((start - now) / 60_000));
      const time = formatClubTime(start);
      const count = rows.length;

      await ctx.scheduler.runAfter(0, internal.modules.push.send.default, {
        clubId: clubId,
        category: "starting",
        title:
          count === 1
            ? `Partita alle ${time}, fra ${minutes} minuti`
            : `${count} partite alle ${time}, fra ${minutes} minuti`,
        body: rows.join("\n"),
        url:
          entry.bookings.length === 1 && entry.external.length === 0
            ? staffBookingUrl(entry.bookings[0]._id)
            : staffAgendaDayUrl(clubDayKey(start)),
        tag: `starting:${start}`,
        ttl: TTL_SECONDS,
      });

      for (const booking of entry.bookings) {
        await ctx.db.patch(booking._id, { remindedStart: start });
      }
      for (const row of entry.external) {
        await ctx.db.patch(row._id, { remindedStart: start });
      }
    }
  },
});
