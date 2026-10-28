import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalQuery } from "../../functions";
import { type DeliveryEntry, recordDeliveries } from "../deliveries/lib";
import { normalizePhone } from "../openMatches/lib";

/**
 * I giocatori veri di una prenotazione, oltre a chi l'ha presa: anche loro
 * ricevono la conferma, le disdette e i cambi d'orario, come chi ha prenotato.
 *
 * Sono di due tipi, come le prenotazioni (bookings/players.ts): i clienti che
 * lo staff ha collegato ai nomi (`linkedPlayerIds`), e chi è nella partita
 * dall'app o dal sito (`openMatches.playerIds`). Chi è stato invitato e non
 * ha ancora risposto non c'è: per lui c'è l'invito (matchInvite.ts), e la
 * conferma gli arriva quando entra (`confirmToNewPlayers`).
 */
export async function notifiedPlayers(
  ctx: QueryCtx,
  booking: Doc<"bookings">,
): Promise<Doc<"players">[]> {
  const match = await ctx.db
    .query("openMatches")
    .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
    .first();

  const ids = match ? match.playerIds : (booking.linkedPlayerIds ?? []);
  const unique = [...new Set(ids)].filter(
    (id) => id !== booking.createdByPlayer,
  );
  const docs = await Promise.all(unique.map((id) => ctx.db.get(id)));
  return docs.filter((doc) => doc !== null);
}

/**
 * Il numero dell'anagrafica pronto per Twilio. In scheda si scrive come
 * capita («333 1234567»), e senza prefisso Twilio lo rifiuterebbe; uno che non
 * si capisce resta com'è, e il rifiuto finisce nel registro con il suo
 * perché.
 */
export function whatsappPhone(phone?: string): string | undefined {
  const trimmed = phone?.trim();
  if (!trimmed) return undefined;
  try {
    return normalizePhone(trimmed);
  } catch {
    return trimmed;
  }
}

export function firstNameOf(player: Doc<"players">): string {
  return player.firstName ?? player.name.split(" ")[0];
}

/** Chi è stato avvisato, per le righe del registro. */
export function playerTarget(player: Doc<"players">) {
  return {
    role: "player" as const,
    playerId: player._id,
    name: player.name,
  };
}

/**
 * Il WhatsApp di conferma ai giocatori. Chi non ha un numero in anagrafica
 * resta scritto come «non inviato»: nella scheda si vede chi va avvisato a
 * voce.
 */
export async function confirmWhatsappToPlayers(
  ctx: MutationCtx,
  bookingId: Id<"bookings">,
  players: Doc<"players">[],
  delayMs = 2000,
) {
  const skipped: DeliveryEntry[] = [];

  for (const player of players) {
    if (!whatsappPhone(player.phone)) {
      skipped.push({
        ...playerTarget(player),
        status: "skipped",
        detail: "Nessun numero di telefono",
      });
      continue;
    }

    await ctx.scheduler.runAfter(
      delayMs,
      internal.modules.notifications.confirmation.sendConfirmationWithWhatsapp,
      { bookingId, playerId: player._id },
    );
  }

  if (skipped.length > 0) {
    await recordDeliveries(ctx, bookingId, "accepted", "whatsapp", skipped);
  }
}

/** Il WhatsApp escluso da chi conferma: vale per tutta la squadra. */
export async function skipWhatsappToPlayers(
  ctx: MutationCtx,
  bookingId: Id<"bookings">,
  players: Doc<"players">[],
  detail: string,
) {
  if (players.length === 0) return;

  await recordDeliveries(
    ctx,
    bookingId,
    "accepted",
    "whatsapp",
    players.map((player) => ({
      ...playerTarget(player),
      recipient: whatsappPhone(player.phone),
      status: "skipped" as const,
      detail,
    })),
  );
}

/**
 * Chi entra in una prenotazione già confermata riceve la conferma allora:
 * mail con il QR e WhatsApp, come gli altri l'hanno avuta alla conferma.
 * Prima della conferma non parte niente: arriverà con quella di tutti.
 */
export async function confirmToNewPlayers(
  ctx: MutationCtx,
  bookingId: Id<"bookings">,
  playerIds: Id<"players">[],
) {
  const booking = await ctx.db.get(bookingId);
  if (
    !booking ||
    booking.status !== "accepted_on_site_payment" ||
    booking.bookingDate <= Date.now()
  ) {
    return;
  }

  const ids = [...new Set(playerIds)].filter(
    (id) => id !== booking.createdByPlayer,
  );
  if (ids.length === 0) return;

  await ctx.scheduler.runAfter(
    0,
    internal.modules.notifications.bookingMail.default,
    {
      bookingId,
      kind: "accepted",
      only: { booker: false, playerIds: ids, guestEmails: [] },
    },
  );

  const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
  await confirmWhatsappToPlayers(
    ctx,
    bookingId,
    docs.filter((doc) => doc !== null),
  );
}

/** Il recapito di un giocatore, per l'azione che spedisce (confirmation.ts). */
export const contact = internalQuery({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) return null;

    return {
      phone: whatsappPhone(player.phone),
      firstName: firstNameOf(player),
      name: player.name,
    };
  },
});
