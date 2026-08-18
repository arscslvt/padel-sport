import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
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

export interface FriendRequestOutcome {
  /** Rapporto fra i due dopo l'operazione. */
  status: "friend" | "outgoing";
  friendshipId: Id<"friendships">;
  /** `false` se il legame era già in questo stato e non è stato toccato. */
  changed: boolean;
}

/**
 * Porta avanti il legame di amicizia da `from` verso `to` di un passo, senza
 * mai lamentarsi: crea la richiesta se non c'è, e se l'altro aveva già chiesto
 * per primo la accetta invece di aprirne una speculare.
 *
 * Il compito di decidere se uno stato immutato è un errore resta a chi chiama:
 * l'aggiunta esplicita di un amico (friends/request.ts) lo segnala, l'invito a
 * una cerchia (modules/circles/invite.ts) tira dritto.
 */
export async function ensureFriendRequest(
  ctx: MutationCtx,
  from: Id<"players">,
  to: Id<"players">,
): Promise<FriendRequestOutcome> {
  const existing = await friendshipBetween(ctx, from, to);

  if (existing?.status === "accepted") {
    return { status: "friend", friendshipId: existing._id, changed: false };
  }

  if (existing?.status === "pending") {
    if (existing.requesterId === from) {
      return { status: "outgoing", friendshipId: existing._id, changed: false };
    }

    await ctx.db.patch(existing._id, {
      status: "accepted",
      respondedAt: Date.now(),
    });

    return { status: "friend", friendshipId: existing._id, changed: true };
  }

  const friendshipId = await ctx.db.insert("friendships", {
    requesterId: from,
    addresseeId: to,
    status: "pending",
    createdAt: Date.now(),
  });

  return { status: "outgoing", friendshipId, changed: true };
}

/**
 * Sblocca l'amicizia ancora in sospeso fra i due, se c'è.
 *
 * Serve a chi accetta l'invito a una cerchia: dire di sì al gruppo vale anche
 * come sì alla richiesta di amicizia partita insieme all'invito, altrimenti si
 * resterebbe nella stessa cerchia senza essere amici.
 */
export async function acceptPendingFriendship(
  ctx: MutationCtx,
  a: Id<"players">,
  b: Id<"players">,
): Promise<void> {
  const friendship = await friendshipBetween(ctx, a, b);
  if (!friendship || friendship.status !== "pending") return;

  await ctx.db.patch(friendship._id, {
    status: "accepted",
    respondedAt: Date.now(),
  });
}
