import { v } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import { type MutationCtx, mutation, type QueryCtx, query } from "../_generated/server";
import {
  guestsOf,
  MAX_PLAYERS,
  occupancyOf,
  syncBookingPlayers,
  syncMatchStatus,
} from "../modules/openMatches/lib";
import { assertServer } from "../utils/serverSecret";

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
  },
  handler: async (ctx, { secret, bookingId, players }) => {
    assertServer(secret);

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Prenotazione non trovata.");
    if (booking.status === "cancelled") {
      throw new Error("La prenotazione è annullata: non si modifica più.");
    }

    const names = players.map((name) => name.trim()).filter(Boolean);

    if (names.length === 0) {
      throw new Error("Serve almeno il nome di chi ha prenotato.");
    }
    for (const name of names) {
      if (name.length < NAME_MIN || name.length > NAME_MAX) {
        throw new Error(
          `Ogni nome deve avere fra ${NAME_MIN} e ${NAME_MAX} caratteri.`,
        );
      }
    }

    const seats = await seatsFor(ctx, booking);
    if (names.length > seats) {
      throw new Error(
        seats < MAX_PLAYERS
          ? `Il campo è condiviso: per questa prenotazione restano ${seats} posti.`
          : `Al massimo ${MAX_PLAYERS} giocatori.`,
      );
    }

    const match = await matchOf(ctx, booking);

    if (!match) {
      await ctx.db.patch(bookingId, {
        players: names,
        bookForAll: names.length >= MAX_PLAYERS,
      });
      return { players: names };
    }

    const locked = await appPlayerNames(ctx, match);
    const guests = without(names, locked);
    if (guests === null) {
      throw new Error(
        "Chi è entrato dall'app non si toglie da qui: deve uscire dalla partita dall'app.",
      );
    }

    // I posti tenuti dagli inviti ancora senza risposta contano: senza, la
    // partita risulterebbe con più giocatori che posti.
    const { total, guests: current } = await occupancyOf(ctx, match);
    if (total - current + guests.length > match.maxPlayers) {
      throw new Error(
        "Ci sono inviti in attesa che tengono dei posti: non c'è spazio per tutti questi nomi.",
      );
    }

    await replaceGuests(ctx, match, guests);
    await syncBookingPlayers(ctx, match);
    await syncMatchStatus(ctx, match._id);

    const updated = await ctx.db.get(bookingId);
    return { players: updated?.players ?? names };
  },
});
