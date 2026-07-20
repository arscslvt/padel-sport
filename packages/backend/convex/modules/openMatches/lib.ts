import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export const SLOT_INTERVAL_MINUTES = 30;
export const MATCH_DURATION_MINUTES = 90;

export const SLOT_INTERVAL_MS = SLOT_INTERVAL_MINUTES * 60 * 1000;
export const MATCH_DURATION_MS = MATCH_DURATION_MINUTES * 60 * 1000;

export const MAX_PLAYERS = 4;
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 5;

export type JoinMode = "direct" | "request";
export type OpenMatchStatus = "open" | "full" | "cancelled";

export interface PlayerView {
  id: Id<"players">;
  name: string;
  level: number;
  avatarUrl?: string;
}

export interface OpenMatchView {
  id: Id<"openMatches">;
  bookingId: Id<"bookings">;
  matchDate: number;
  levelMin: number;
  levelMax: number;
  joinMode: JoinMode;
  status: OpenMatchStatus;
  maxPlayers: number;
  notes?: string;
  court?: string;
  creator: PlayerView;
  players: PlayerView[];
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

/**
 * Trova un campo libero per l'orario richiesto.
 * Stessa logica di disponibilità di bookings/create.ts (flusso web, invariato),
 * con in più l'esclusione delle prenotazioni cancellate: se cambia lì,
 * va allineata anche qui.
 */
export async function findAvailableSlot(
  ctx: QueryCtx,
  bookingDate: number,
): Promise<Doc<"slots"> | null> {
  const activeSlots = (await ctx.db.query("slots").collect())
    .filter((slot) => slot.active)
    .sort((a, b) => a.name.localeCompare(b.name));

  const possibleOverlaps = await ctx.db
    .query("bookings")
    .withIndex("by_booking_date", (q) =>
      q
        .gte("bookingDate", bookingDate - MATCH_DURATION_MS + 1)
        .lt("bookingDate", bookingDate + MATCH_DURATION_MS),
    )
    .collect();

  const bookingEnd = bookingDate + MATCH_DURATION_MS;

  const selectedSlot = activeSlots.find((slot) => {
    return !possibleOverlaps.some((existingBooking) => {
      if (existingBooking.status === "cancelled") {
        return false;
      }

      const existingStart = existingBooking.bookingDate;
      const existingEnd = existingStart + MATCH_DURATION_MS;

      if (!overlaps(existingStart, existingEnd, bookingDate, bookingEnd)) {
        return false;
      }

      return !existingBooking.slot || existingBooking.slot === slot._id;
    });
  });

  return selectedSlot ?? null;
}

/** Mappa un range numerico di livello sul livello testuale delle prenotazioni web. */
export function levelLabel(
  levelMin: number,
  levelMax: number,
): "principiante" | "intermedio" | "avanzato" {
  const avg = (levelMin + levelMax) / 2;
  if (avg < 2.5) return "principiante";
  if (avg < 3.5) return "intermedio";
  return "avanzato";
}

export async function getIdentityPlayer(
  ctx: QueryCtx,
): Promise<Doc<"players"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("players")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

/** Richiede utente autenticato con profilo giocatore completo. */
export async function requirePlayer(ctx: QueryCtx): Promise<Doc<"players">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Devi effettuare l'accesso.");
  }

  const player = await ctx.db
    .query("players")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  if (!player) {
    throw new Error("Completa il tuo profilo giocatore prima di continuare.");
  }

  return player;
}

export function toPlayerView(player: Doc<"players">): PlayerView {
  return {
    id: player._id,
    name: player.name,
    level: player.level,
    avatarUrl: player.avatarUrl,
  };
}

/** Arricchisce una partita con giocatori e nome del campo. */
export async function toMatchView(
  ctx: QueryCtx,
  match: Doc<"openMatches">,
): Promise<OpenMatchView> {
  const playerDocs = await Promise.all(
    match.playerIds.map((id) => ctx.db.get(id)),
  );
  const players = playerDocs.filter((p) => p !== null).map(toPlayerView);

  const creator = players.find((p) => p.id === match.creatorId) ?? players[0];

  const booking = await ctx.db.get(match.bookingId);
  const slot = booking ? await ctx.db.get(booking.slot) : null;

  return {
    id: match._id,
    bookingId: match.bookingId,
    matchDate: match.matchDate,
    levelMin: match.levelMin,
    levelMax: match.levelMax,
    joinMode: match.joinMode,
    status: match.status,
    maxPlayers: match.maxPlayers,
    notes: match.notes,
    court: slot?.name,
    creator,
    players,
  };
}

/**
 * Aggiunge un giocatore a una partita aperta (dopo i controlli del chiamante
 * su modalità di accesso) e tiene allineati i nomi sulla prenotazione,
 * così la dashboard web vede la squadra aggiornata.
 */
export async function addPlayerToMatch(
  ctx: MutationCtx,
  match: Doc<"openMatches">,
  player: Doc<"players">,
): Promise<void> {
  if (match.status !== "open") {
    throw new Error("La partita non è più aperta.");
  }

  if (match.matchDate <= Date.now()) {
    throw new Error("La partita è già iniziata o conclusa.");
  }

  if (match.playerIds.includes(player._id)) {
    throw new Error("Sei già in questa partita.");
  }

  if (match.playerIds.length >= match.maxPlayers) {
    throw new Error("La partita è al completo.");
  }

  if (player.level < match.levelMin || player.level > match.levelMax) {
    throw new Error(
      "Il tuo livello non rientra in quello richiesto dalla partita.",
    );
  }

  const playerIds = [...match.playerIds, player._id];

  await ctx.db.patch(match._id, {
    playerIds,
    status: playerIds.length >= match.maxPlayers ? "full" : "open",
  });

  const booking = await ctx.db.get(match.bookingId);
  if (booking && !booking.players.includes(player.name)) {
    await ctx.db.patch(match.bookingId, {
      players: [...booking.players, player.name],
    });
  }
}
