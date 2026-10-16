import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import {
  MATCH_DURATION_MINUTES,
  normalizePhone,
} from "../modules/openMatches/lib";
import { notifiedPlayers } from "../modules/notifications/bookingPlayers";
import { assertServer } from "../utils/serverSecret";

/**
 * Il WhatsApp di conferma, mandato di nuovo dallo staff.
 *
 * Il primo tentativo parte alla conferma (bookings/update.ts) o alla
 * creazione dal gestionale (bookings/staffCreate.ts). Quando non arriva — il
 * numero era sbagliato, non era su WhatsApp, l'invio era stato escluso — lo
 * staff corregge il numero e lo rimanda da qui. Ogni tentativo resta una riga
 * a sé in `bookingDeliveries`: lo storico dice anche quello andato male.
 *
 * Passa dalla route della dashboard (api/dashboard/bookings/whatsapp), che ha
 * già verificato che chi chiede è dello staff.
 */

/** Il numero come lo salva una prenotazione, o com'era scritto se non si capisce. */
function bookingPhone(phone: string): string {
  try {
    return normalizePhone(phone);
  } catch {
    return phone.trim();
  }
}

/**
 * Porta il numero nuovo di un cliente sulle sue prenotazioni ancora da
 * giocare. Il numero sulla prenotazione è una copia, presa quando è nata: se
 * lo staff lo corregge in anagrafica, il prossimo WhatsApp deve partire verso
 * quello giusto. Le prenotazioni passate restano com'erano: lo storico è
 * storico.
 */
export async function syncUpcomingPhone(
  ctx: MutationCtx,
  playerId: Id<"players">,
  rawPhone: string,
) {
  const phone = bookingPhone(rawPhone);
  const upcoming = await ctx.db
    .query("bookings")
    .withIndex("by_created_by_player", (q) =>
      q.eq("createdByPlayer", playerId).gte("bookingDate", Date.now()),
    )
    .collect();

  for (const booking of upcoming) {
    if (booking.status === "cancelled" || booking.phone === phone) continue;
    await ctx.db.patch(booking._id, { phone });
  }
}

/**
 * Il numero di chi ha prenotato, cambiato sulla prenotazione e basta.
 *
 * La scheda cliente non si tocca da qui: l'anagrafica la corregge chi la
 * apre, ed è da lì che il numero nuovo arriva sulle prenotazioni future
 * (`syncUpcomingPhone`). Il verso contrario, una prenotazione che riscrive
 * l'anagrafica, cambiava i dati del cliente senza che nessuno li guardasse.
 */
export async function setBookerPhone(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
  phone: string,
): Promise<void> {
  if (phone === booking.phone) return;
  await ctx.db.patch(booking._id, { phone });
}

/** Stati di un WhatsApp che è partito o sta partendo: rimandarlo sarebbe un doppione. */
const ON_ITS_WAY = new Set(["queued", "sent", "delivered", "read"]);

export const resend = mutation({
  args: {
    secret: v.string(),
    bookingId: v.id("bookings"),
    /** Il numero a cui mandarlo: quello della prenotazione, o corretto. */
    phone: v.string(),
    /**
     * Un giocatore della prenotazione invece di chi l'ha presa
     * (modules/notifications/bookingPlayers.ts). Il suo numero sta solo
     * nella scheda: corretto qui, si corregge lì.
     */
    playerId: v.optional(v.id("players")),
  },
  handler: async (ctx, { secret, bookingId, phone: rawPhone, playerId }) => {
    assertServer(secret);

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");

    if (booking.status !== "accepted_on_site_payment") {
      throw new Error(
        "Il WhatsApp di conferma si manda solo per le prenotazioni confermate.",
      );
    }
    if (booking.bookingDate + MATCH_DURATION_MINUTES * 60_000 < Date.now()) {
      throw new Error("La partita è già finita.");
    }

    const deliveries = await ctx.db
      .query("bookingDeliveries")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .collect();
    const latest = deliveries
      .filter(
        (row) =>
          row.channel === "whatsapp" &&
          row.kind === "accepted" &&
          (playerId
            ? row.role === "player" && row.playerId === playerId
            : row.role === "booker"),
      )
      .reduce<(typeof deliveries)[number] | null>(
        (last, row) => (!last || row.createdAt > last.createdAt ? row : last),
        null,
      );

    // Un giocatore senza righe non l'ha mai avuta: le prenotazioni
    // confermate prima che la conferma andasse a tutti. Gli spetta se è
    // davvero fra i giocatori collegati.
    if (
      playerId &&
      !latest &&
      !(await notifiedPlayers(ctx, booking)).some(
        (player) => player._id === playerId,
      )
    ) {
      throw new Error("Questo giocatore non è collegato alla prenotazione.");
    }

    // Prima del registro degli avvisi lo diceva solo lo stato sulla
    // prenotazione.
    const alreadySent = latest
      ? ON_ITS_WAY.has(latest.status)
      : !playerId && booking.notificationStatus === "sent_with_whatsapp";
    if (alreadySent) {
      throw new Error(
        "Il WhatsApp di conferma è già partito: se non arriva, lo stato si aggiorna da solo nella scheda.",
      );
    }

    const phone = normalizePhone(rawPhone);

    if (playerId) {
      const player = await ctx.db.get(playerId);
      if (!player) throw new Error("Cliente non trovato.");

      const clientUpdated = bookingPhone(player.phone ?? "") !== phone;
      if (clientUpdated) {
        await ctx.db.patch(playerId, { phone });
        await syncUpcomingPhone(ctx, playerId, phone);
      }

      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.confirmation
          .sendConfirmationWithWhatsapp,
        { bookingId, playerId },
      );
      return { phone, clientUpdated };
    }
    await setBookerPhone(ctx, booking, phone);

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.confirmation.sendConfirmationWithWhatsapp,
      { bookingId },
    );

    return { phone, clientUpdated: false };
  },
});
