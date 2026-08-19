import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { membersOf, requireCircleMember } from "../circles/lib";
import { isMembershipValid, membershipStatus } from "../clients/lib";
import { bookingSettings, isWithinOpeningHours } from "../settings/lib";
import { addGuestToMatch } from "./guests";
import { inviteToMatch } from "./invite";
import {
  findAvailableSlot,
  LEVEL_MAX,
  LEVEL_MIN,
  levelLabel,
  MATCH_DURATION_MINUTES,
  MAX_PLAYERS,
  normalizePhone,
  requirePlayer,
  SLOT_INTERVAL_MS,
} from "./lib";
import { formatClubDateTime } from "../../utils/clubTime";

/**
 * Crea una prenotazione dall'app mobile: occupa un campo reale
 * (stessa tabella e stessa logica di disponibilità del web) e ci costruisce
 * sopra una partita, sempre — cambia solo chi la vede.
 *
 * - `private`: la vedono solo gli invitati, e si entra solo su invito.
 * - `public`: la partita finisce fra quelle aperte a tutti.
 * - `circle`: è riservata ai membri di `circleId`, che ricevono tutti un
 *   invito.
 *
 * In tutti e tre i casi si può comporre la squadra fin da subito, con
 * giocatori dell'app da invitare e nomi di chi l'app non ce l'ha. Si può
 * anche non indicare nessuno: per la struttura vale come "vengo con altri
 * tre". Se poi la partita non si riempie, da privata o da cerchia il creatore
 * può aprirla a tutti (modules/openMatches/publish.ts).
 */
export default mutation({
  args: {
    bookingDate: v.number(),
    levelMin: v.number(),
    levelMax: v.number(),
    visibility: v.union(
      v.literal("private"),
      v.literal("public"),
      v.literal("circle"),
    ),
    circleId: v.optional(v.id("circles")),
    joinMode: v.optional(v.union(v.literal("direct"), v.literal("request"))),
    /** Giocatori dell'app da invitare: ognuno tiene un posto in attesa. */
    invitePlayerIds: v.optional(v.array(v.id("players"))),
    /** Giocatori senza app: solo un nome, e la mail se la si vuole lasciare. */
    guests: v.optional(
      v.array(
        v.object({ name: v.string(), email: v.optional(v.string()) }),
      ),
    ),
    notes: v.optional(v.string()),
    /**
     * Recapito del prenotante: lo raccoglie il sito, dove la squadra si
     * compone di soli nomi e il club ha bisogno di poter richiamare.
     * Senza, la conferma WhatsApp non ha un destinatario.
     */
    phone: v.optional(v.string()),
    /** Da dove arriva la prenotazione: cambia solo l'avviso allo staff. */
    origin: v.optional(v.union(v.literal("app"), v.literal("web"))),
  },
  handler: async (ctx, args) => {
    const player = await requirePlayer(ctx);

    if (args.bookingDate <= Date.now()) {
      throw new Error("La data e l'ora devono essere nel futuro.");
    }

    if (args.bookingDate % SLOT_INTERVAL_MS !== 0) {
      throw new Error(
        "L'orario deve essere selezionato a scaglioni di 30 minuti.",
      );
    }

    // Gli orari di apertura sono configurabili dalla dashboard: fino a ieri il
    // server accettava qualsiasi orario allineato ai 30 minuti, comprese le
    // tre di notte.
    const settings = await bookingSettings(ctx);

    if (
      !isWithinOpeningHours(
        settings,
        args.bookingDate,
        MATCH_DURATION_MINUTES,
      )
    ) {
      throw new Error("La struttura è chiusa nell'orario selezionato.");
    }

    const horizon =
      Date.now() + settings.bookableDays * 24 * 60 * 60 * 1000;

    if (args.bookingDate > horizon) {
      throw new Error(
        `Si può prenotare fino a ${settings.bookableDays} giorni in anticipo.`,
      );
    }

    // La tessera del club, quando il club la pretende. È l'unico punto da cui
    // passano sia il sito sia l'app, quindi il controllo si scrive qui e vale
    // per entrambi. Spento di default: acceso su un'anagrafica vuota
    // rifiuterebbe chiunque (modules/settings/lib.ts).
    if (settings.membershipRequired) {
      const { state } = await membershipStatus(ctx, player._id);

      if (!isMembershipValid(state)) {
        throw new Error(
          "Per prenotare online serve l'iscrizione al club in corso. Passa in struttura per rinnovarla.",
        );
      }
    }

    if (
      args.levelMin < LEVEL_MIN ||
      args.levelMax > LEVEL_MAX ||
      args.levelMin > args.levelMax
    ) {
      throw new Error("Il livello richiesto non è valido.");
    }

    const phone = args.phone ? normalizePhone(args.phone) : undefined;

    if (args.visibility === "public" && !args.joinMode) {
      throw new Error(
        "Scegli come far entrare gli altri giocatori nella partita.",
      );
    }

    if (args.visibility === "circle" && !args.circleId) {
      throw new Error("Scegli la cerchia in cui creare la partita.");
    }

    const invitePlayerIds = args.invitePlayerIds ?? [];
    const guests = args.guests ?? [];

    // Il conto si fa prima di scrivere: creatore + invitati + ospiti. Occupare
    // il campo per poi scoprire che la squadra non ci sta sarebbe peggio.
    if (1 + invitePlayerIds.length + guests.length > MAX_PLAYERS) {
      throw new Error(
        `In campo si sta in ${MAX_PLAYERS}: togli qualcuno dalla squadra.`,
      );
    }

    // Restringe il tipo per il resto dell'handler: da qui in poi `circleId`
    // c'è se e solo se la partita è di cerchia.
    const circleId = args.visibility === "circle" ? args.circleId : undefined;

    // Solo chi è nella cerchia può organizzarci dentro una partita
    let circleMemberIds: Id<"players">[] = [];
    if (circleId) {
      await requireCircleMember(ctx, circleId, player._id);
      circleMemberIds = (await membersOf(ctx, circleId)).map(
        (row) => row.playerId,
      );
    }

    const slot = await findAvailableSlot(ctx, args.bookingDate);
    if (!slot) {
      throw new Error(
        "L'orario selezionato non e disponibile. Scegli uno slot differente.",
      );
    }

    // 6 cifre alfanumeriche casuali per il codice di prenotazione
    const bookingCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const existingCode = await ctx.db
      .query("bookings")
      .withIndex("by_code", (q) => q.eq("code", bookingCode))
      .first();

    if (existingCode) {
      throw new Error("Si è verificato un errore. Riprova a prenotare.");
    }

    const notes = args.notes?.trim() || undefined;

    const bookingId = await ctx.db.insert("bookings", {
      bookedBy: player.name,
      phone,
      players: [player.name],
      bookingDate: args.bookingDate,
      level: levelLabel(args.levelMin, args.levelMax),
      bookForAll: false,
      slot: slot._id,
      pricePerPlayer: 7,
      paymentMode: "on_site",
      status: "pending_on_site_payment",
      createdAt: Date.now(),
      code: bookingCode,
      createdByPlayer: player._id,
    });

    const matchId = await ctx.db.insert("openMatches", {
      bookingId,
      creatorId: player._id,
      playerIds: [player._id],
      maxPlayers: MAX_PLAYERS,
      matchDate: args.bookingDate,
      levelMin: args.levelMin,
      levelMax: args.levelMax,
      // Fuori dalle partite aperte non si chiede il permesso: chi è stato
      // invitato è già approvato.
      joinMode: args.visibility === "public" ? (args.joinMode ?? "direct") : "direct",
      status: "open",
      visibility: args.visibility,
      circleId,
      notes,
      createdAt: Date.now(),
    });

    const match = await ctx.db.get(matchId);
    if (!match) {
      throw new Error("Si è verificato un errore. Riprova a prenotare.");
    }

    // Gli invitati per nome tengono il posto, gli ospiti lo occupano davvero:
    // in entrambi i casi la logica sta nei rispettivi moduli e non qui.
    if (invitePlayerIds.length > 0) {
      await inviteToMatch(ctx, match, invitePlayerIds);
    }

    for (const guest of guests) {
      await addGuestToMatch(ctx, match, player._id, guest);
    }

    // Ogni membro della cerchia riceve l'invito, tranne chi la sta creando.
    // Questi non tengono il posto: una cerchia può avere venti persone.
    if (circleId) {
      await Promise.all(
        circleMemberIds
          .filter((playerId) => playerId !== player._id)
          .filter((playerId) => !invitePlayerIds.includes(playerId))
          .map((playerId) =>
            ctx.db.insert("matchInvites", {
              matchId,
              circleId,
              playerId,
              kind: "circle",
              status: "pending",
              createdAt: Date.now(),
            }),
          ),
      );
    }

    const visibilityNote =
      args.visibility === "public"
        ? " (partita aperta)"
        : args.visibility === "circle"
          ? " (partita di cerchia)"
          : " (partita privata)";

    // Il campo è nostro anche agli occhi di SumUp solo quando l'evento è sul
    // calendario condiviso: senza, quell'orario resterebbe prenotabile di là.
    await ctx.scheduler.runAfter(
      0,
      internal.modules.courtCalendar.push.default,
      { bookingId },
    );

    const origin = args.origin ?? "app";

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      {
        title:
          origin === "web"
            ? "Nuova prenotazione dal sito"
            : "Nuova prenotazione dall'app",
        message: `${player.name} ha prenotato per il ${formatClubDateTime(
          args.bookingDate,
        )}${visibilityNote}.`,
        tags: ["booking", "new", origin === "web" ? "web" : "mobile"],
      },
    );

    return { bookingId, matchId, code: bookingCode };
  },
});
