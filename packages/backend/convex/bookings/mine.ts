import { clubQuery } from "../functions";
import {
  onlinePaymentsActive,
  paymentSummary,
} from "../modules/payments/lib";
import {
  courtLabel,
  getIdentityPlayer,
  MATCH_DURATION_MS,
  seatsOf,
} from "../modules/openMatches/lib";

/**
 * Le prenotazioni di chi sta guardando, dalla più vicina in poi.
 *
 * Serve a rientrare in possesso del codice quando la mail di conferma non
 * arriva: chi ha prenotato si riconosce con la stessa verifica via email del
 * modulo di prenotazione e ritrova qui codice e QR.
 *
 * Ci sono anche le partite in cui si gioca senza averle prenotate: chi ha
 * accettato un invito, o chi lo staff ha collegato a un nome
 * (`bookingPlayers`). Per quelle il codice c'è, ma pagare e rimandare la mail
 * restano di chi ha prenotato.
 *
 * Restituisce un elenco vuoto — non un errore — a chi non è autenticato o non
 * ha ancora un profilo giocatore: la pagina che la usa mostra prima la
 * verifica, e un'eccezione la costringerebbe a indovinare il perché.
 */
export default clubQuery({
  args: {},
  handler: async (ctx) => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return [];

    // Una partita iniziata da poco vale ancora la pena di mostrarla: si entra
    // in struttura a ridosso dell'orario, non prima.
    const now = Date.now();
    const from = now - MATCH_DURATION_MS;
    const paymentsActive = await onlinePaymentsActive(ctx, ctx.club._id);

    const own = await ctx.db
      .query("bookings")
      .withIndex("by_created_by_player", (q) =>
        q.eq("createdByPlayer", player._id).gte("bookingDate", from),
      )
      .collect();

    const playing = await ctx.db
      .query("bookingPlayers")
      .withIndex("by_player", (q) =>
        q.eq("playerId", player._id).gte("bookingDate", from),
      )
      .collect();
    const ownIds = new Set(own.map((booking) => booking._id));
    const joined = (
      await Promise.all(
        playing
          .filter((row) => !ownIds.has(row.bookingId))
          .map((row) => ctx.db.get(row.bookingId)),
      )
    ).filter((booking) => booking !== null);

    const bookings = [...own, ...joined];

    return await Promise.all(
      bookings
        .filter((booking) => booking.status !== "cancelled")
        .sort((a, b) => a.bookingDate - b.bookingDate)
        .map(async (booking) => {
          const court = await courtLabel(ctx, booking);

          // Le prenotazioni nate prima delle partite aperte non hanno un
          // `openMatches`: senza, la mail di conferma non si può rimandare.
          const match = await ctx.db
            .query("openMatches")
            .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
            .first();

          return {
            code: booking.code,
            bookingDate: booking.bookingDate,
            court,
            level: booking.level,
            players: booking.players,
            /** I posti in campo: quattro per campo occupato. */
            seats: seatsOf(booking),
            status: booking.status,
            matchId: match?._id,
            /** Prenotata da chi guarda, o una partita in cui gioca. */
            isBooker: booking.createdByPlayer === player._id,
            payment: paymentSummary(
              booking,
              now,
              paymentsActive && booking.createdByPlayer === player._id,
            ),
          };
        }),
    );
  },
});
