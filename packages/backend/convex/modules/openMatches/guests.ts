import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { mutation } from "../../_generated/server";
import {
  occupancyOf,
  requirePlayer,
  syncBookingPlayers,
  syncMatchStatus,
} from "./lib";

const NAME_MAX = 60;

/** Controllo minimo: qui la mail non è una credenziale, è un recapito. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Aggiunge alla partita un giocatore che non ha l'app.
 *
 * Non c'è nulla da accettare: il nome lo mette chi organizza e vale come
 * conferma, quindi il posto è occupato da subito.
 */
export async function addGuestToMatch(
  ctx: MutationCtx,
  match: Doc<"openMatches">,
  addedBy: Id<"players">,
  guest: { name: string; email?: string },
): Promise<Id<"matchGuests">> {
  const name = guest.name.trim();
  if (name.length < 2) {
    throw new Error("Scrivi il nome del giocatore (almeno due caratteri).");
  }

  if (name.length > NAME_MAX) {
    throw new Error(`Il nome non può superare i ${NAME_MAX} caratteri.`);
  }

  const email = guest.email?.trim().toLowerCase() || undefined;
  if (email && !EMAIL_PATTERN.test(email)) {
    throw new Error("L'indirizzo email non sembra valido.");
  }

  const { free } = await occupancyOf(ctx, match);
  if (free <= 0) {
    throw new Error("Non ci sono più posti liberi in questa partita.");
  }

  const guestId = await ctx.db.insert("matchGuests", {
    matchId: match._id,
    name,
    email,
    addedBy,
    createdAt: Date.now(),
  });

  await syncBookingPlayers(ctx, match);
  await syncMatchStatus(ctx, match._id);

  return guestId;
}

/** Solo il creatore mette mano alla squadra di una partita già creata. */
async function requireMatchCreator(
  ctx: MutationCtx,
  matchId: Id<"openMatches">,
): Promise<{ match: Doc<"openMatches">; player: Doc<"players"> }> {
  const player = await requirePlayer(ctx);

  const match = await ctx.db.get(matchId);
  if (!match) {
    throw new Error("Partita non trovata.");
  }

  if (match.creatorId !== player._id) {
    throw new Error("Solo chi ha creato la partita può modificarne la squadra.");
  }

  if (match.status === "cancelled") {
    throw new Error("La partita è stata annullata.");
  }

  if (match.matchDate <= Date.now()) {
    throw new Error("La partita è già iniziata o conclusa.");
  }

  return { match, player };
}

/**
 * Aggiunge un giocatore senza app.
 *
 * La mail è facoltativa e non serve alla partita: viene raccolta per potergli
 * poi mandare un invito a scaricare l'app (tables/matchGuests.ts).
 */
export const add = mutation({
  args: {
    matchId: v.id("openMatches"),
    name: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { matchId, name, email }) => {
    const { match, player } = await requireMatchCreator(ctx, matchId);

    const guestId = await addGuestToMatch(ctx, match, player._id, {
      name,
      email,
    });

    return { guestId };
  },
});

/** Toglie un ospite e libera il suo posto. */
export const remove = mutation({
  args: { guestId: v.id("matchGuests") },
  handler: async (ctx, { guestId }) => {
    const guest = await ctx.db.get(guestId);
    if (!guest) {
      throw new Error("Giocatore non trovato.");
    }

    const { match } = await requireMatchCreator(ctx, guest.matchId);

    await ctx.db.delete(guestId);

    await syncBookingPlayers(ctx, match);
    await syncMatchStatus(ctx, match._id);

    return { matchId: match._id };
  },
});
