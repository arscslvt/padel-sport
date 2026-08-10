import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type { PlayerView } from "../openMatches/lib";

/**
 * Rapporto tra chi guarda e un altro giocatore:
 * `incoming` = lui ha chiesto a me, `outgoing` = io ho chiesto a lui.
 */
export type FriendRelation = "none" | "friend" | "incoming" | "outgoing";

export interface FriendRequestView {
  friendshipId: Id<"friendships">;
  player: PlayerView;
  createdAt: number;
}

export interface SearchResultView {
  player: PlayerView;
  relation: FriendRelation;
  friendshipId: Id<"friendships"> | null;
}

/**
 * Riga di amicizia tra due giocatori, in qualunque verso sia stata creata.
 * La coppia è unica, quindi al massimo una delle due letture ha un risultato.
 */
export async function friendshipBetween(
  ctx: QueryCtx,
  a: Id<"players">,
  b: Id<"players">,
): Promise<Doc<"friendships"> | null> {
  const sent = await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q) => q.eq("requesterId", a).eq("addresseeId", b))
    .unique();

  if (sent) return sent;

  return await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q) => q.eq("requesterId", b).eq("addresseeId", a))
    .unique();
}

/** Traduce una riga di amicizia nel rapporto visto da `viewerId`. */
export function relationOf(
  friendship: Doc<"friendships"> | null,
  viewerId: Id<"players">,
): FriendRelation {
  if (!friendship) return "none";
  if (friendship.status === "accepted") return "friend";
  return friendship.requesterId === viewerId ? "outgoing" : "incoming";
}

/** Tutte le righe che coinvolgono il giocatore, in entrambi i ruoli. */
export async function friendshipsOf(
  ctx: QueryCtx,
  playerId: Id<"players">,
): Promise<Doc<"friendships">[]> {
  const [asRequester, asAddressee] = await Promise.all([
    ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", playerId))
      .collect(),
    ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", playerId))
      .collect(),
  ]);

  return [...asRequester, ...asAddressee];
}

/** L'altro capo della riga rispetto al giocatore indicato. */
export function otherSide(
  friendship: Doc<"friendships">,
  playerId: Id<"players">,
): Id<"players"> {
  return friendship.requesterId === playerId
    ? friendship.addresseeId
    : friendship.requesterId;
}
