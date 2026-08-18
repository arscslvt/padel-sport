import { query } from "../_generated/server";
import {
  getIdentityPlayer,
  MATCH_DURATION_MS,
} from "../modules/openMatches/lib";

/**
 * Le prenotazioni di chi sta guardando, dalla più vicina in poi.
 *
 * Serve a rientrare in possesso del codice quando la mail di conferma non
 * arriva: chi ha prenotato si riconosce con la stessa verifica via email del
 * modulo di prenotazione e ritrova qui codice e QR.
 *
 * Restituisce un elenco vuoto — non un errore — a chi non è autenticato o non
 * ha ancora un profilo giocatore: la pagina che la usa mostra prima la
 * verifica, e un'eccezione la costringerebbe a indovinare il perché.
 */
export default query({
  handler: async (ctx) => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return [];

    // Una partita iniziata da poco vale ancora la pena di mostrarla: si entra
    // in struttura a ridosso dell'orario, non prima.
    const from = Date.now() - MATCH_DURATION_MS;

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_created_by_player", (q) =>
        q.eq("createdByPlayer", player._id).gte("bookingDate", from),
      )
      .collect();

    return await Promise.all(
      bookings
        .filter((booking) => booking.status !== "cancelled")
        .sort((a, b) => a.bookingDate - b.bookingDate)
        .map(async (booking) => {
          const slot = await ctx.db.get(booking.slot);

          // Le prenotazioni nate prima delle partite aperte non hanno un
          // `openMatches`: senza, la mail di conferma non si può rimandare.
          const match = await ctx.db
            .query("openMatches")
            .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
            .first();

          return {
            code: booking.code,
            bookingDate: booking.bookingDate,
            court: slot?.name,
            level: booking.level,
            players: booking.players,
            status: booking.status,
            matchId: match?._id,
          };
        }),
    );
  },
});
