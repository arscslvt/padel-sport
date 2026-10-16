import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { isMembershipValid, membershipStatus } from "../clients/lib";
import { notifiedPlayers } from "../notifications/bookingPlayers";

/**
 * Chi, fra i giocatori collegati di una prenotazione, paga la tariffa
 * tesserati (`bookings.memberPlayers`).
 *
 * Si fotografa a ogni cambio di squadra (modules/points/auto.ts,
 * `bookingChanged`), come il prezzo alla nascita della prenotazione: una
 * tessera fatta dopo non cambia il conto di una partita già composta, ma un
 * compagno collegato dopo paga per quello che è quando entra.
 */
export async function syncMemberPricing(
  ctx: MutationCtx,
  bookingId: Id<"bookings">,
): Promise<void> {
  const booking = await ctx.db.get(bookingId);
  if (!booking || booking.status === "cancelled") return;

  const memberPrice =
    booking.memberPricePerPlayer ?? booking.bookerPricePerPlayer;
  const discounted =
    memberPrice !== undefined && memberPrice !== booking.pricePerPlayer;

  const members: { playerId: Id<"players">; name: string }[] = [];
  if (discounted) {
    for (const player of await notifiedPlayers(ctx, booking)) {
      const { state } = await membershipStatus(ctx, player._id);
      if (isMembershipValid(state)) {
        members.push({ playerId: player._id, name: player.name });
      }
    }
  }

  const before = JSON.stringify(booking.memberPlayers ?? []);
  if (before === JSON.stringify(members)) return;

  await ctx.db.patch(bookingId, {
    memberPlayers: members.length > 0 ? members : undefined,
  });
}
