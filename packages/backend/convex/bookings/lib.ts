import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { syncMatchStatus } from "../modules/openMatches/lib";
import { formatClubDateTime } from "../utils/clubTime";

/**
 * Scioglie l'unione di una prenotazione che sta per essere annullata.
 *
 * Va chiamata **prima** di cancellare, da ogni punto che annulla: la dashboard
 * (bookings/delete.ts) e l'app (modules/openMatches/cancel.ts). Chi resta ha
 * ancora una prenotazione valida, e tre cose vanno rimesse a posto:
 *
 * 1. il legame, che non ha più un altro capo;
 * 2. l'evento sul calendario condiviso — se quello pubblicato era della
 *    prenotazione che se ne va, il campo risulterebbe libero su SumUp pur
 *    essendo ancora occupato. `push.default` esce da solo se un evento c'è già,
 *    quindi si può schedulare sempre;
 * 3. i posti in campo, che tornano liberi davvero.
 *
 * Resta una cosa che il software non può fare: chi resta aveva ricevuto una
 * mail che diceva «campo completo», e adesso non lo è più. Quella telefonata la
 * fa una persona, e per questo lo staff riceve l'avviso.
 */
export async function releaseMerge(
  ctx: MutationCtx,
  bookingId: Id<"bookings">,
): Promise<void> {
  const booking = await ctx.db.get(bookingId);
  if (!booking?.mergedWith) return;

  const partnerId = booking.mergedWith;
  const partner = await ctx.db.get(partnerId);

  await ctx.db.patch(bookingId, { mergedWith: undefined });

  if (!partner) return;

  await ctx.db.patch(partnerId, { mergedWith: undefined });

  if (partner.status === "cancelled") return;

  await ctx.scheduler.runAfter(0, internal.modules.courtCalendar.push.default, {
    bookingId: partnerId,
  });

  const partnerMatch = await ctx.db
    .query("openMatches")
    .withIndex("by_booking", (q) => q.eq("bookingId", partnerId))
    .first();

  if (partnerMatch) {
    await syncMatchStatus(ctx, partnerMatch._id);
  }

  await ctx.scheduler.runAfter(0, internal.modules.notifications.alert.default, {
    title: "Campo unito non più completo",
    message: `${partner.bookedBy}, ${formatClubDateTime(
      partner.bookingDate,
    )}: ${booking.bookedBy} ha disdetto. Il campo torna incompleto.`,
    tags: ["booking", "merge", "cancelled"],
    priority: "high",
  });
}
