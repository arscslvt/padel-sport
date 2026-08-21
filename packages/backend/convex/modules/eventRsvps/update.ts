import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import {
  assertGuests,
  confirmedRsvps,
  STAFF_MAX_GUESTS,
  seatsLabel,
  seatsTakenOf,
} from "./lib";

/**
 * Cambia quanti accompagnatori porta un'iscrizione.
 *
 * È il caso più comune della sera dell'evento: uno si è iscritto da solo e si
 * presenta in tre, oppure il contrario. Fin qui l'unica strada era annullare
 * l'iscrizione e rifarla — che perde l'ora in cui era arrivata, il token del
 * link di annullamento e le spunte già fatte alla cassa.
 *
 * Solo il numero, non il nome né l'email: quelli sono l'identità della riga —
 * l'email decide i doppioni e a chi vanno le comunicazioni, e riscriverla
 * dalla dashboard vorrebbe dire cambiare persona lasciando la stessa
 * iscrizione. Chi si è iscritto per sbaglio si annulla e si rifà.
 *
 * `eventId` e `blockKey` arrivano insieme all'`_id` e devono corrispondere: la
 * capienza che la route ha appena riletto è quella di *quel* modulo, e senza
 * il confronto basterebbe un id sbagliato per misurarla su un altro evento.
 */
export default mutation({
  args: {
    secret: v.string(),
    id: v.id("eventRsvps"),
    /** Il modulo da cui arriva la richiesta: la riga deve appartenergli. */
    eventId: v.string(),
    blockKey: v.string(),
    guests: v.number(),
    /** Posti totali del modulo. Assente = iscrizioni illimitate. */
    capacity: v.optional(v.number()),
    /** Passa anche oltre la capienza: è la seconda pressione sul tasto. */
    override: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);
    assertGuests(args.guests, STAFF_MAX_GUESTS);

    const rsvp = await ctx.db.get(args.id);

    if (
      !rsvp ||
      rsvp.eventId !== args.eventId ||
      rsvp.blockKey !== args.blockKey
    ) {
      throw new ConvexError({
        code: "not_found",
        message: "Iscrizione non trovata.",
      });
    }

    if (rsvp.status !== "confirmed") {
      throw new ConvexError({
        code: "cancelled",
        message: "Questa iscrizione è stata annullata: non occupa più posti.",
      });
    }

    const confirmed = await confirmedRsvps(ctx, args.eventId, args.blockKey);
    const seatsTaken = seatsTakenOf(confirmed);
    const delta = args.guests - rsvp.guests;

    if (delta === 0) {
      return { id: args.id, guests: rsvp.guests, seatsTaken };
    }

    // La capienza si guarda solo quando si sale: chi scende libera posti, e
    // farsi fermare mentre si toglie gente da un evento pieno sarebbe assurdo.
    if (delta > 0 && args.capacity !== undefined && !args.override) {
      const seatsLeft = Math.max(args.capacity - seatsTaken, 0);

      if (delta > seatsLeft) {
        throw new ConvexError({
          code: "full",
          seatsLeft,
          message:
            seatsLeft === 0
              ? "I posti sono esauriti: puoi aggiungerlo lo stesso, ma vai oltre la capienza."
              : `Restano ${seatsLabel(seatsLeft)} e ne servono ${delta} in più: puoi aggiungerli lo stesso, ma vai oltre la capienza.`,
        });
      }
    }

    /*
     * Scendendo, le spunte degli accompagnatori spariti si buttano invece di
     * lasciarle fuori scala. In lettura verrebbero scartate lo stesso (vedi
     * `list.ts`), ma qui il numero può anche risalire — e quelle spunte
     * tornerebbero a galla, segnando «arrivati» ospiti che nessuno ha visto.
     */
    await ctx.db.patch(args.id, {
      guests: args.guests,
      ...(delta < 0
        ? {
            checkedInGuests: (rsvp.checkedInGuests ?? []).filter(
              (index) => index < args.guests,
            ),
          }
        : {}),
    });

    return { id: args.id, guests: args.guests, seatsTaken: seatsTaken + delta };
  },
});
