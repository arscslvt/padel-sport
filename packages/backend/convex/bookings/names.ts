import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { syncBookingPlayers } from "../modules/openMatches/lib";
import { syncMemberPricing } from "../modules/pricing/members";

/**
 * I nomi delle persone sulle prenotazioni ancora da giocare.
 *
 * Una prenotazione tiene i nomi in copia: `bookedBy`, il titolo della scheda
 * e dell'agenda, e `players`, la squadra. Si scrivono quando nasce, e finché
 * nessuno li toccava un nome corretto in anagrafica restava sbagliato sulla
 * partita: «Pepoe Coco» sopra una scheda che dice «Giuseppe Coco». Le
 * prenotazioni passate restano com'erano: lo storico è storico.
 */

/** Il nome nuovo di un cliente, portato sulle sue prenotazioni future. */
export async function syncUpcomingName(
  ctx: MutationCtx,
  playerId: Id<"players">,
  previous: string,
  name: string,
): Promise<void> {
  if (previous === name) return;

  const upcoming = await ctx.db
    .query("bookings")
    .withIndex("by_booking_date", (q) => q.gte("bookingDate", Date.now()))
    .collect();

  for (const booking of upcoming) {
    if (booking.status === "cancelled") continue;

    // Con una partita la squadra si rilegge dai giocatori (e il nome
    // nuovo arriva da sé); chi l'ha creata è anche chi ha prenotato.
    const match = await ctx.db
      .query("openMatches")
      .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
      .first();
    if (match) {
      if (!match.playerIds.includes(playerId)) continue;
      if (match.creatorId === playerId) {
        await ctx.db.patch(booking._id, { bookedBy: name });
      }
      await syncBookingPlayers(ctx, match);
      continue;
    }

    const booker = booking.createdByPlayer === playerId;
    const linked = booking.linkedPlayerIds?.includes(playerId) ?? false;
    if (!booker && !linked) continue;

    // Il primo nome è chi prenota; un collegato si ritrova dal nome di prima.
    const players = [...booking.players];
    if (booker) {
      players[0] = name;
    } else {
      const index = players.indexOf(previous, 1);
      if (index !== -1) players[index] = name;
    }

    await ctx.db.patch(booking._id, {
      players,
      ...(booker ? { bookedBy: name } : {}),
    });
    // I tesserati della prenotazione si riconoscono dal nome.
    await syncMemberPricing(ctx, booking._id);
  }
}

/**
 * Da lanciare una volta: riallinea «prenotato da» al nome della scheda di
 * chi ha prenotato, sulle prenotazioni future. Serve a quelle nate prima che
 * il nome seguisse l'anagrafica (16/10/2026). Rilanciarla non fa danni:
 * tocca solo quelle che non tornano.
 *
 *   bunx convex run bookings/names:alignBookers [--prod]
 */
export const alignBookers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const upcoming = await ctx.db
      .query("bookings")
      .withIndex("by_booking_date", (q) => q.gte("bookingDate", Date.now()))
      .collect();

    const fixed: string[] = [];
    for (const booking of upcoming) {
      if (booking.status === "cancelled" || !booking.createdByPlayer) continue;
      const player = await ctx.db.get(booking.createdByPlayer);
      if (!player || player.name === booking.bookedBy) continue;

      const players = [...booking.players];
      if (players.length > 0) players[0] = player.name;

      await ctx.db.patch(booking._id, { bookedBy: player.name, players });
      await syncMemberPricing(ctx, booking._id);
      fixed.push(`${booking.bookedBy} → ${player.name}`);
    }
    return { fixed };
  },
});
