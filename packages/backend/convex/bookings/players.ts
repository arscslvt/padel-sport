import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { type MutationCtx, mutation, type QueryCtx, query } from "../_generated/server";
import {
  guestsOf,
  MAX_PLAYERS,
  occupancyOf,
  syncBookingPlayers,
  syncMatchStatus,
} from "../modules/openMatches/lib";
import { confirmToNewPlayers } from "../modules/notifications/bookingPlayers";
import { bookingChanged } from "../modules/points/auto";
import { assertServer } from "../utils/serverSecret";
import { linkablePlayers } from "./staffCreate";

/**
 * I giocatori di una prenotazione, corretti dallo staff: allo sportello si
 * scopre chi gioca davvero, e la prenotazione deve dirlo.
 *
 * Le prenotazioni sono di due tipi, e la squadra sta in posti diversi:
 *
 * - quelle prese dallo staff, o nate prima delle partite, hanno solo
 *   l'elenco di nomi sulla prenotazione: si riscrive quello;
 * - quelle del sito e dell'app hanno una partita (`openMatches`), e l'elenco
 *   sulla prenotazione ne è solo lo specchio (`syncBookingPlayers`). Lì i nomi
 *   senza app sono ospiti della partita, e si correggono quelli: scrivere
 *   sull'elenco e basta verrebbe cancellato al primo ingresso o uscita.
 *   Chi è entrato dall'app non si toglie da qui, si toglie dall'app.
 *
 * Passa dalla route della dashboard (api/dashboard/bookings/players), che ha
 * già verificato con Clerk che chi chiede è dello staff.
 */

const NAME_MIN = 2;
const NAME_MAX = 60;

async function matchOf(
  ctx: QueryCtx,
  booking: Doc<"bookings">,
): Promise<Doc<"openMatches"> | null> {
  return await ctx.db
    .query("openMatches")
    .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
    .first();
}

/** I nomi di chi è in partita con l'app: non si toccano da qui. */
async function appPlayerNames(
  ctx: QueryCtx,
  match: Doc<"openMatches">,
): Promise<string[]> {
  const docs = await Promise.all(match.playerIds.map((id) => ctx.db.get(id)));
  return docs.filter((doc) => doc !== null).map((doc) => doc.name);
}

/** Quanti posti restano a questa prenotazione, se il campo è condiviso. */
async function seatsFor(
  ctx: QueryCtx,
  booking: Doc<"bookings">,
): Promise<number> {
  if (!booking.mergedWith) return MAX_PLAYERS;

  const partner = await ctx.db.get(booking.mergedWith);
  return Math.max(1, MAX_PLAYERS - (partner?.players.length ?? 0));
}

/** Toglie da `names` una occorrenza per ciascun nome di `remove`. */
function without(names: string[], remove: string[]): string[] | null {
  const rest = [...names];
  for (const name of remove) {
    const index = rest.indexOf(name);
    if (index === -1) return null;
    rest.splice(index, 1);
  }
  return rest;
}

/**
 * I nomi già collegati a un cliente: dalla partita, se c'è, se no da chi ha
 * prenotato e dai collegamenti dello staff.
 */
async function linksOf(
  ctx: QueryCtx,
  booking: Doc<"bookings">,
  match: Doc<"openMatches"> | null,
): Promise<{ name: string; playerId: Id<"players">; fixed: boolean }[]> {
  const ids = match
    ? match.playerIds
    : [
        ...(booking.createdByPlayer ? [booking.createdByPlayer] : []),
        ...(booking.linkedPlayerIds ?? []),
      ];
  const docs = await Promise.all([...new Set(ids)].map((id) => ctx.db.get(id)));
  return docs
    .filter((doc) => doc !== null)
    .map((doc) => ({
      name: doc.name,
      playerId: doc._id,
      // Chi ha prenotato, e chi è in partita dall'app, non si scollega da qui.
      fixed: Boolean(match) || doc._id === booking.createdByPlayer,
    }));
}

/** Quel che serve al modulo di modifica: i nomi, quelli bloccati, i posti. */
export const forEdit = query({
  args: { secret: v.string(), bookingId: v.id("bookings") },
  handler: async (ctx, { secret, bookingId }) => {
    assertServer(secret);

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");

    const match = await matchOf(ctx, booking);

    return {
      players: booking.players,
      /** In partita con l'app: si vedono, non si cambiano. */
      locked: match ? await appPlayerNames(ctx, match) : [],
      /** I nomi collegati a un cliente in anagrafica. */
      links: await linksOf(ctx, booking, match),
      /** Il massimo di nomi per questa prenotazione. */
      seats: await seatsFor(ctx, booking),
    };
  },
});

async function replaceGuests(
  ctx: MutationCtx,
  match: Doc<"openMatches">,
  names: string[],
) {
  const existing = await guestsOf(ctx, match._id);

  // Chi resta con lo stesso nome tiene la sua riga, e con lei la mail per
  // l'invito all'app: si cancella solo chi non c'è più.
  const kept = new Set<string>();
  const toAdd: string[] = [];
  for (const name of names) {
    const same = existing.find(
      (guest) => guest.name === name && !kept.has(guest._id),
    );
    if (same) kept.add(same._id);
    else toAdd.push(name);
  }

  for (const guest of existing) {
    if (!kept.has(guest._id)) await ctx.db.delete(guest._id);
  }

  for (const name of toAdd) {
    await ctx.db.insert("matchGuests", {
      matchId: match._id,
      name,
      addedBy: match.creatorId,
      createdAt: Date.now(),
    });
  }
}

export const update = mutation({
  args: {
    secret: v.string(),
    bookingId: v.id("bookings"),
    /** Tutti i nomi, nell'ordine: il primo è chi ha prenotato. */
    players: v.array(v.string()),
    /**
     * I nomi collegati a un cliente in anagrafica. Senza, i collegamenti
     * restano quelli che c'erano (le pagine aperte prima di questo campo).
     */
    links: v.optional(
      v.array(v.object({ name: v.string(), playerId: v.id("players") })),
    ),
  },
  handler: async (ctx, { secret, bookingId, players, links }) => {
    assertServer(secret);

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");
    if (booking.status === "cancelled") {
      throw new Error("La prenotazione è stata annullata.");
    }

    const names = players.map((name) => name.trim()).filter(Boolean);

    if (names.length === 0) {
      throw new Error("Inserisci almeno il nome di chi prenota.");
    }
    for (const name of names) {
      if (name.length < NAME_MIN || name.length > NAME_MAX) {
        throw new Error(
          `Ogni nome deve avere da ${NAME_MIN} a ${NAME_MAX} caratteri.`,
        );
      }
    }

    const seats = await seatsFor(ctx, booking);
    if (names.length > seats) {
      throw new Error(
        seats < MAX_PLAYERS
          ? `Il campo è condiviso. Puoi inserire fino a ${seats} giocatori.`
          : `Puoi inserire fino a ${MAX_PLAYERS} giocatori.`,
      );
    }

    const match = await matchOf(ctx, booking);

    // Un collegamento vale solo per un nome che è davvero in campo.
    const wantedLinks = links?.filter((link) => names.includes(link.name));

    if (!match) {
      const linkedPlayerIds = wantedLinks
        ? await linkablePlayers(
            ctx,
            wantedLinks.map((link) => link.playerId),
            booking.createdByPlayer,
          )
        : booking.linkedPlayerIds;

      // Il recapito resta a chi è ancora in campo senza scheda: collegato a
      // un cliente, il numero buono è quello della sua scheda.
      const linkedNames = new Set((wantedLinks ?? []).map((link) => link.name));
      const guestContacts = booking.guestContacts?.filter(
        (contact) =>
          names.includes(contact.name) && !linkedNames.has(contact.name),
      );

      await ctx.db.patch(bookingId, {
        guestContacts: guestContacts?.length ? guestContacts : undefined,
        players: names,
        // Il titolo della scheda è il primo nome: corretto lì, si corregge
        // anche «prenotato da».
        bookedBy: names[0],
        bookForAll: names.length >= MAX_PLAYERS,
        linkedPlayerIds,
      });
      await bookingChanged(ctx, bookingId);

      // Un cliente collegato adesso a una prenotazione già confermata riceve
      // la conferma ora: gli altri l'hanno avuta quando è stata confermata.
      const before = new Set(booking.linkedPlayerIds ?? []);
      await confirmToNewPlayers(
        ctx,
        bookingId,
        (linkedPlayerIds ?? []).filter((id) => !before.has(id)),
      );
      return { players: names };
    }

    const locked = await appPlayerNames(ctx, match);
    let guests = without(names, locked);
    if (guests === null) {
      throw new Error(
        "Chi si è unito dall'app può uscire solo dall'app.",
      );
    }

    // Un ospite collegato a un cliente diventa un giocatore della partita: la
    // vede nella sua area personale e gli conta nei premi. Il posto è lo
    // stesso, cambia solo chi lo occupa.
    const joining: Id<"players">[] = [];
    for (const link of wantedLinks ?? []) {
      if (match.playerIds.includes(link.playerId)) continue;
      if (joining.includes(link.playerId)) continue;

      const rest = without(guests, [link.name]);
      if (rest === null) continue;
      if (!(await ctx.db.get(link.playerId))) {
        throw new Error("Cliente non trovato.");
      }
      guests = rest;
      joining.push(link.playerId);
    }

    // I posti tenuti dagli inviti ancora senza risposta contano: senza, la
    // partita risulterebbe con più giocatori che posti.
    const { total, guests: current } = await occupancyOf(ctx, match);
    if (total - current + guests.length > match.maxPlayers) {
      throw new Error(
        "Alcuni posti sono riservati a inviti in attesa di risposta.",
      );
    }

    if (joining.length > 0) {
      await ctx.db.patch(match._id, {
        playerIds: [...match.playerIds, ...joining],
      });

      // Un invito ancora aperto per chi è appena entrato è ormai una risposta.
      for (const playerId of joining) {
        const invite = await ctx.db
          .query("matchInvites")
          .withIndex("by_match_player", (q) =>
            q.eq("matchId", match._id).eq("playerId", playerId),
          )
          .first();
        if (invite?.status === "pending") {
          await ctx.db.patch(invite._id, {
            status: "accepted",
            respondedAt: Date.now(),
          });
        }
      }
    }

    const latest = (await ctx.db.get(match._id)) ?? match;
    await replaceGuests(ctx, latest, guests);
    await syncBookingPlayers(ctx, latest);
    await syncMatchStatus(ctx, match._id);
    await confirmToNewPlayers(ctx, bookingId, joining);

    const updated = await ctx.db.get(bookingId);
    return { players: updated?.players ?? names };
  },
});
