import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { type PlayerView, toPlayerView } from "../openMatches/lib";

/**
 * Quante cerchie può avere un giocatore, contando sia quelle create da lui
 * sia quelle a cui è stato invitato. La cerchia generale delle amicizie non
 * rientra nel conto: quella è una sola e ce l'hanno tutti.
 */
export const MAX_CIRCLES = 3;

/** Tetto ai membri di una cerchia: è un gruppo ristretto, non una community. */
export const MAX_CIRCLE_MEMBERS = 20;

export type CircleRole = "owner" | "member";

export interface CircleView {
  id: Id<"circles">;
  name: string;
  role: CircleRole;
  owner: PlayerView;
  members: PlayerView[];
  /** Inviti ancora senza risposta, visibili solo al proprietario. */
  pendingInvites: number;
  /** Inizio della prossima partita di cerchia, se ce n'è una in programma. */
  nextMatchDate: number | null;
}

export interface CircleInviteView {
  inviteId: Id<"circleInvites">;
  circleId: Id<"circles">;
  circleName: string;
  inviter: PlayerView;
  note?: string;
  createdAt: number;
  /** Numero di membri già dentro, per far capire in cosa si sta entrando. */
  memberCount: number;
}

/** Tutte le cerchie di cui il giocatore fa parte, a qualunque titolo. */
export async function membershipsOf(
  ctx: QueryCtx,
  playerId: Id<"players">,
): Promise<Doc<"circleMembers">[]> {
  return await ctx.db
    .query("circleMembers")
    .withIndex("by_player", (q) => q.eq("playerId", playerId))
    .collect();
}

/** Righe di appartenenza di una cerchia, proprietario incluso. */
export async function membersOf(
  ctx: QueryCtx,
  circleId: Id<"circles">,
): Promise<Doc<"circleMembers">[]> {
  return await ctx.db
    .query("circleMembers")
    .withIndex("by_circle", (q) => q.eq("circleId", circleId))
    .collect();
}

/** La riga di appartenenza del giocatore a quella cerchia, se esiste. */
export async function membershipOf(
  ctx: QueryCtx,
  circleId: Id<"circles">,
  playerId: Id<"players">,
): Promise<Doc<"circleMembers"> | null> {
  return await ctx.db
    .query("circleMembers")
    .withIndex("by_circle_player", (q) =>
      q.eq("circleId", circleId).eq("playerId", playerId),
    )
    .unique();
}

/** Profili dei membri, in ordine alfabetico e senza i buchi lasciati da chi non c'è più. */
export async function memberViews(
  ctx: QueryCtx,
  memberships: Doc<"circleMembers">[],
): Promise<PlayerView[]> {
  const docs = await Promise.all(
    memberships.map((membership) => ctx.db.get(membership.playerId)),
  );

  return docs
    .filter((doc) => doc !== null)
    .map(toPlayerView)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** La cerchia esiste e il giocatore ne fa parte. */
export async function requireCircleMember(
  ctx: QueryCtx,
  circleId: Id<"circles">,
  playerId: Id<"players">,
): Promise<{ circle: Doc<"circles">; membership: Doc<"circleMembers"> }> {
  const circle = await ctx.db.get(circleId);
  if (!circle) {
    throw new Error("Cerchia non trovata.");
  }

  const membership = await membershipOf(ctx, circleId, playerId);
  if (!membership) {
    throw new Error("Non fai parte di questa cerchia.");
  }

  return { circle, membership };
}

/**
 * La cerchia esiste ed è di chi la sta modificando.
 * Inviti, rimozioni e scioglimento passano solo dal proprietario.
 */
export async function requireCircleOwner(
  ctx: QueryCtx,
  circleId: Id<"circles">,
  playerId: Id<"players">,
): Promise<Doc<"circles">> {
  const circle = await ctx.db.get(circleId);
  if (!circle) {
    throw new Error("Cerchia non trovata.");
  }

  if (circle.ownerId !== playerId) {
    throw new Error("Solo chi ha creato la cerchia può gestirla.");
  }

  return circle;
}

/** Blocca la creazione o l'ingresso oltre il tetto di cerchie a testa. */
export async function assertCircleQuota(
  ctx: QueryCtx,
  playerId: Id<"players">,
): Promise<void> {
  const memberships = await membershipsOf(ctx, playerId);

  if (memberships.length >= MAX_CIRCLES) {
    throw new Error(
      `Puoi far parte di ${MAX_CIRCLES} cerchie al massimo: esci da una per entrare in un'altra.`,
    );
  }
}

/** Partite della cerchia non ancora giocate, dalla più vicina in poi. */
export async function upcomingCircleMatches(
  ctx: QueryCtx,
  circleId: Id<"circles">,
): Promise<Doc<"openMatches">[]> {
  const matches = await ctx.db
    .query("openMatches")
    .withIndex("by_circle_date", (q) =>
      q.eq("circleId", circleId).gte("matchDate", Date.now()),
    )
    .order("asc")
    .collect();

  return matches.filter((match) => match.status !== "cancelled");
}
