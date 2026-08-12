import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";

/** Quanti accompagnatori sono ammessi se l'editor non ha configurato il limite. */
const DEFAULT_MAX_GUESTS = 3;

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
    maxGuests: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 2) {
      throw new ConvexError({
        code: "invalid",
        message: "Inserisci il tuo nome.",
      });
    }

    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new ConvexError({
        code: "invalid",
        message: "Inserisci un indirizzo email valido.",
      });
    }

    const maxGuests = args.maxGuests ?? DEFAULT_MAX_GUESTS;
    if (
      !Number.isInteger(args.guests) ||
      args.guests < 0 ||
      args.guests > maxGuests
    ) {
      throw new ConvexError({
        code: "invalid",
        message: maxGuests
          ? `Puoi indicare al massimo ${maxGuests} accompagnatori.`
          : "Questo evento non ammette accompagnatori.",
      });
    }

    const seats = args.guests + 1;

    const existing = await ctx.db
      .query("eventRsvps")
      .withIndex("by_form", (q) =>
        q.eq("eventId", args.eventId).eq("blockKey", args.blockKey),
      )
      .collect();

    const confirmed = existing.filter((entry) => entry.status === "confirmed");

    if (confirmed.some((entry) => entry.email === email)) {
      throw new ConvexError({
        code: "duplicate",
        message: "Risulta già un'iscrizione con questa email.",
      });
    }

    const seatsTaken = confirmed.reduce(
      (total, entry) => total + entry.guests + 1,
      0,
    );

    if (args.capacity !== undefined) {
      const seatsLeft = Math.max(args.capacity - seatsTaken, 0);

      if (seats > seatsLeft) {
        throw new ConvexError({
          code: "full",
          message:
            seatsLeft === 0
              ? "I posti disponibili sono esauriti."
              : `Resta${seatsLeft === 1 ? "" : "no"} solo ${seatsLeft} ${seatsLeft === 1 ? "posto" : "posti"}: riduci gli accompagnatori.`,
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
