import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction, internalQuery } from "../../_generated/server";
import { notificationKind } from "../../tables/bookingDeliveries";
import type { Id } from "../../_generated/dataModel";
import type { DeliveryEntry } from "../deliveries/lib";
import { courtLabel, MATCH_DURATION_MS } from "../openMatches/lib";
import { notifiedPlayers } from "./bookingPlayers";

/**
 * Le mail che seguono una prenotazione dopo che è stata creata: la conferma
 * della struttura, l'unione con un altro gruppo e le disdette.
 *
 * Partono dal sito (là vivono Resend e i modelli), ma i destinatari stanno
 * qui: l'indirizzo degli ospiti non esce da nessuna query pubblica, e non
 * deve. Per questo il verso è Convex → sito e non il contrario — chi accetta o
 * annulla dalla dashboard è la struttura, non chi ha prenotato, e una query
 * leggibile dallo staff sarebbe una query leggibile da chiunque.
 *
 * Senza `SITE_URL` e `BOOKING_WEBHOOK_SECRET` non parte niente: restano una
 * riga nei log e una nel registro degli avvisi, che lo staff vede nella
 * scheda. L'accettazione e la disdetta restano valide, come sempre.
 */

/**
 * Cosa è successo alla prenotazione (`notificationKind`). Il QR viaggia solo
 * con `accepted`: è quello a dire al cliente che il campo è suo per davvero —
 * ed è la ragione per cui `merged` è una mail a parte e non lo porta. Sapere
 * con chi si gioca e avere il campo confermato sono due notizie diverse, e
 * arrivano in due momenti diversi: la struttura unisce quando trova la coppia
 * giusta, conferma quando decide di incassare.
 *
 * Ogni invio lascia le sue righe in `bookingDeliveries`, una per destinatario:
 * è da lì che la scheda della prenotazione sa se il cliente l'ha ricevuta.
 *
 * I destinatari sono chi ha prenotato, i giocatori veri della prenotazione
 * (bookingPlayers.ts) e gli ospiti che hanno lasciato la mail.
 */

/** Come risponde il sito (apps/web/app/api/bookings/notify), destinatario per destinatario. */
type NotifyResult = {
  role: "booker" | "player" | "guest";
  playerId?: Id<"players">;
  name?: string;
  email?: string;
  /** L'id dell'email su Resend: è quello che i webhook riportano */
  id?: string;
  error?: string;
  skipped?: string;
};

function toEntry(result: NotifyResult): DeliveryEntry {
  const target = {
    role: result.role,
    playerId: result.playerId,
    name: result.name,
    recipient: result.email,
  };
  if (result.id) {
    return { ...target, status: "queued", providerId: result.id };
  }
  if (result.skipped) {
    return { ...target, status: "skipped", detail: result.skipped };
  }
  return {
    ...target,
    status: "failed",
    detail: result.error ?? "Resend non l'ha accettata",
  };
}

export const payload = internalQuery({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) return null;

    const court = await courtLabel(ctx, booking);

    const match = await ctx.db
      .query("openMatches")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .first();

    const guests = match
      ? await ctx.db
          .query("matchGuests")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect()
      : [];

    // L'indirizzo di chi ha prenotato non è qui: sta su Clerk, e lo risolve il
    // sito partendo da questo identificativo.
    const creator = booking.createdByPlayer
      ? await ctx.db.get(booking.createdByPlayer)
      : null;

    // Il gruppo con cui si divide il campo, quando la struttura ha unito due
    // prenotazioni. Senza, la mail di conferma direbbe «mancano due giocatori»
    // a un campo che è pieno.
    const partner = booking.mergedWith
      ? await ctx.db.get(booking.mergedWith)
      : null;

    // Come per chi ha prenotato, l'indirizzo di chi ha un account lo risolve
    // il sito da Clerk; la copia in anagrafica vale per chi non ce l'ha.
    const playerRecipients = (await notifiedPlayers(ctx, booking)).map(
      (player) => ({
      playerId: player._id,
      name: player.name,
      email: player.email,
        clerkUserId: player.clerkUserId,
      }),
    );

    return {
      code: booking.code,
      start: booking.bookingDate,
      end: booking.bookingDate + MATCH_DURATION_MS,
      court,
      bookedBy: booking.bookedBy,
      players: booking.players,
      accepted: booking.status === "accepted_on_site_payment",
      partner:
        partner && partner.status !== "cancelled"
          ? { bookedBy: partner.bookedBy, players: partner.players }
          : undefined,
      bookerClerkUserId: creator?.clerkUserId,
      // La copia in anagrafica: chi non ha un account (la prenotazione presa
      // dallo staff a nome di un socio dello sportello) la mail la riceve qui.
      bookerEmail: creator?.email,
      playerRecipients,
      guests: guests
        .filter((guest) => guest.email)
        .map((guest) => ({ name: guest.name, email: guest.email as string })),
    };
  },
});

export default internalAction({
  args: {
    bookingId: v.id("bookings"),
    kind: notificationKind,
    /** Con `rescheduled`: l'orario di prima, perché la mail dica cosa cambia. */
    previousStart: v.optional(v.number()),
    /**
     * Solo queste persone, invece di tutti: chi entra in una prenotazione già
     * confermata (bookingPlayers.ts), o chi non l'ha ricevuta e lo staff
     * gliela rimanda (bookings/email.ts). Gli altri l'hanno già avuta.
     */
    only: v.optional(
      v.object({
        booker: v.boolean(),
        playerIds: v.array(v.id("players")),
        guestEmails: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, { bookingId, kind, previousStart, only }) => {
    const full = await ctx.runQuery(
      internal.modules.notifications.bookingMail.payload,
      { bookingId },
    );

    if (!full) return;

    const data = only
      ? {
          ...full,
          bookerClerkUserId: only.booker ? full.bookerClerkUserId : undefined,
          bookerEmail: only.booker ? full.bookerEmail : undefined,
          guests: full.guests.filter((guest) =>
            only.guestEmails.includes(guest.email.toLowerCase()),
          ),
          playerRecipients: full.playerRecipients.filter((player) =>
            only.playerIds.includes(player.playerId),
          ),
        }
      : full;
    if (
      only &&
      !only.booker &&
      data.playerRecipients.length === 0 &&
      data.guests.length === 0
    ) {
      return;
    }

    // Quando la mail non parte per niente, la riga va a chi l'aspettava: chi
    // ha prenotato, oppure, con `only`, ognuna delle persone scelte.
    const failAll = (detail: string): DeliveryEntry[] => {
      const booker: DeliveryEntry[] =
        !only || only.booker
          ? [
              {
                role: "booker",
                recipient: data.bookerEmail,
                status: "failed",
                detail,
              },
            ]
          : [];
      if (!only) return booker;

      return [
        ...booker,
        ...data.playerRecipients.map(
          (player): DeliveryEntry => ({
            role: "player",
            playerId: player.playerId,
            name: player.name,
            recipient: player.email,
            status: "failed",
            detail,
          }),
        ),
        ...data.guests.map(
          (guest): DeliveryEntry => ({
            role: "guest",
            name: guest.name,
            recipient: guest.email,
            status: "failed",
            detail,
          }),
        ),
      ];
    };

    const record = (entries: DeliveryEntry[]) =>
      ctx.runMutation(internal.modules.deliveries.record.default, {
        bookingId,
        kind,
        channel: "email",
        entries,
      });

    const siteUrl = process.env.SITE_URL;
    const secret = process.env.BOOKING_WEBHOOK_SECRET;

    if (!siteUrl || !secret) {
      const missing = [
        siteUrl ? null : "SITE_URL",
        secret ? null : "BOOKING_WEBHOOK_SECRET",
      ].filter(Boolean);

      console.warn(
        `Mail della prenotazione non inviata: manca ${missing.join(" e ")} sul deployment Convex.`,
      );
      await record(failAll("Invio delle mail non configurato"));
      return;
    }

    // Nessuno a cui scrivere: né un account, né una mail in anagrafica, né
    // giocatori o ospiti con un indirizzo. I giocatori li controlla il sito,
    // che li cerca anche su Clerk.
    if (
      !data.bookerClerkUserId &&
      !data.bookerEmail &&
      data.playerRecipients.length === 0 &&
      data.guests.length === 0
    ) {
      await record([
        { role: "booker", status: "skipped", detail: "Nessun indirizzo email" },
      ]);
      return;
    }

    try {
      const response = await fetch(`${siteUrl}/api/bookings/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-booking-webhook-secret": secret,
        },
        body: JSON.stringify({
          ...data,
          kind,
          previousStart,
          // Il sito non segna «nessun indirizzo» a chi ha prenotato quando la
          // mail non è per lui.
          bookerExcluded: Boolean(only && !only.booker),
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        results?: NotifyResult[];
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(`${response.status}: ${payload?.error ?? "risposta non valida"}`);
      }

      // Un sito non ancora aggiornato risponde senza `results`: le mail sono
      // partite, ma senza gli id non c'è niente da seguire.
      if (payload?.results) {
        await record(payload.results.map(toEntry));
      }
    } catch (error) {
      // Quel che doveva succedere è già successo: una mail che non parte non
      // lo annulla, ma lo staff deve saperlo per avvisare a voce — e la riga
      // fallita fa partire l'avviso (deliveries/lib.ts).
      console.error("Mail della prenotazione non recapitata:", error);

      await record(failAll("Il sito non ha spedito la mail"));
    }
  },
});
