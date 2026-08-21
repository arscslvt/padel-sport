import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import {
  assertGuests,
  confirmedRsvps,
  DEFAULT_MAX_GUESTS,
  normalizedEmail,
  normalizedName,
  STAFF_MAX_GUESTS,
  seatsLabel,
  seatsTakenOf,
} from "./lib";

/** I campi di un'iscrizione, uguali da qualunque porta entri. */
const rsvpArgs = {
  eventId: v.string(),
  blockKey: v.string(),
  eventSlug: v.string(),
  eventTitle: v.string(),
  name: v.string(),
  email: v.string(),
  guests: v.number(),
  /**
   * Generato dalla route e non qui: serve comunque là per comporre il link
   * nella mail, e il runtime di Convex preferisce restare deterministico.
   */
  cancelToken: v.string(),
  /** Posti totali del modulo. Assente = iscrizioni illimitate. */
  capacity: v.optional(v.number()),
};

/**
 * Registra un'iscrizione al modulo RSVP di un evento.
 *
 * `capacity` e `maxGuests` arrivano dal chiamante ma non dal browser: la route
 * del sito li rilegge da Sanity prima di chiamare qui, perché sono la
 * configurazione del blocco e non un dato dell'utente.
 *
 * Duplicati e posti si controllano dentro la mutation e non nella route: le
 * mutation Convex sono transazionali, quindi due iscrizioni simultanee
 * sull'ultimo posto non possono passare entrambe.
 */
export default mutation({
  args: {
    ...rsvpArgs,
    maxGuests: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const name = normalizedName(args.name, "Inserisci il tuo nome.");
    const email = normalizedEmail(args.email);

    assertGuests(args.guests, args.maxGuests ?? DEFAULT_MAX_GUESTS);

    const seats = args.guests + 1;
    const confirmed = await confirmedRsvps(ctx, args.eventId, args.blockKey);

    if (confirmed.some((entry) => entry.email === email)) {
      throw new ConvexError({
        code: "duplicate",
        message: "Risulta già un'iscrizione con questa email.",
      });
    }

    const seatsTaken = seatsTakenOf(confirmed);

    if (args.capacity !== undefined) {
      const seatsLeft = Math.max(args.capacity - seatsTaken, 0);

      if (seats > seatsLeft) {
        throw new ConvexError({
          code: "full",
          seatsLeft,
          message:
            seatsLeft === 0
              ? "I posti disponibili sono esauriti."
              : `Resta${seatsLeft === 1 ? "" : "no"} solo ${seatsLabel(seatsLeft)}: riduci gli accompagnatori.`,
        });
      }
    }

    const id = await ctx.db.insert("eventRsvps", {
      eventId: args.eventId,
      blockKey: args.blockKey,
      eventSlug: args.eventSlug,
      eventTitle: args.eventTitle,
      name,
      email,
      guests: args.guests,
      status: "confirmed",
      cancelToken: args.cancelToken,
      createdAt: Date.now(),
    });

    return { id, seatsTaken: seatsTaken + seats };
  },
});

/**
 * Iscrive qualcuno dalla dashboard.
 *
 * Nome, email e doppioni si controllano come sopra — su quelli la porta da cui
 * si entra non cambia niente. Cadono invece le due regole che valgono solo per
 * chi si iscrive da sé:
 *
 * - la scadenza, che qui non arriva nemmeno come argomento. A fermarsi davanti
 *   a `closesAt` è la route del sito; questa non la guarda, perché «iscrizioni
 *   chiuse» vuol dire che il modulo ha smesso di raccogliere da solo, non che
 *   il club non possa più aggiungere nessuno. È proprio dopo la chiusura che
 *   arrivano le telefonate;
 * - il tetto agli accompagnatori, che diventa quello dello staff: un
 *   antirefuso, non una regola dell'evento.
 *
 * La capienza resta, ma come domanda invece che come muro: senza `override` il
 * posto in più torna indietro con `full` e il numero vero dei posti rimasti,
 * così chi sta al banco decide sapendo. Con `override` passa — a volte la
 * persona è lì davanti e la sedia si trova.
 */
export const byStaff = mutation({
  args: {
    secret: v.string(),
    ...rsvpArgs,
    /** Iscrive anche oltre la capienza: è la seconda pressione sul tasto. */
    override: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Iscrivere qualcun altro è un atto della struttura: «essere loggati» lo è
    // anche il cliente che sta aspettando dall'altra parte del banco.
    assertServer(args.secret);

    const name = normalizedName(
      args.name,
      "Inserisci il nome di chi si iscrive.",
    );
    const email = normalizedEmail(args.email);

    assertGuests(args.guests, STAFF_MAX_GUESTS);

    const seats = args.guests + 1;
    const confirmed = await confirmedRsvps(ctx, args.eventId, args.blockKey);

    if (confirmed.some((entry) => entry.email === email)) {
      throw new ConvexError({
        code: "duplicate",
        message:
          "Questa email è già in elenco: cambia gli accompagnatori dell'iscrizione che c'è, invece di aggiungerne una seconda.",
      });
    }

    const seatsTaken = seatsTakenOf(confirmed);
    const seatsLeft =
      args.capacity === undefined
        ? null
        : Math.max(args.capacity - seatsTaken, 0);

    if (seatsLeft !== null && seats > seatsLeft && !args.override) {
      throw new ConvexError({
        code: "full",
        seatsLeft,
        message:
          seatsLeft === 0
            ? "I posti sono esauriti: puoi iscriverlo lo stesso, ma vai oltre la capienza."
            : `Restano ${seatsLabel(seatsLeft)} e ne servono ${seats}: puoi iscriverlo lo stesso, ma vai oltre la capienza.`,
      });
    }

    const id = await ctx.db.insert("eventRsvps", {
      eventId: args.eventId,
      blockKey: args.blockKey,
      eventSlug: args.eventSlug,
      eventTitle: args.eventTitle,
      name,
      email,
      guests: args.guests,
      status: "confirmed",
      cancelToken: args.cancelToken,
      createdAt: Date.now(),
    });

    return { id, seatsTaken: seatsTaken + seats };
  },
});
