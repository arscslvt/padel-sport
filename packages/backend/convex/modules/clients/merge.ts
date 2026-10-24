import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../../_generated/server";
import { syncUpcomingPhone } from "../../bookings/whatsapp";
import { assertServer } from "../../utils/serverSecret";
import { bookingChanged, reconcileReferral } from "../points/auto";

/**
 * Unisce due schede della stessa persona: il doppione aperto allo sportello
 * confluisce nella scheda da tenere, e poi sparisce.
 *
 * Eliminare il doppione non basta quando ha già una storia: le prenotazioni
 * in cui ha prenotato o giocato, le tessere, i punti. Qui ogni riferimento
 * passa alla scheda da tenere, e i campi dell'anagrafica che lì mancano si
 * prendono dal doppione.
 *
 * Il doppione non deve avere un account: amicizie, cerchie, inviti alle
 * partite e pagamenti online nascono solo dall'app, e quindi una scheda senza
 * account non ne ha. Le prenotazioni annullate restano con il vecchio
 * collegamento: non contano per niente, e il nome scritto resta quello.
 *
 * I punti si possono portare con sé o lasciar cadere: capita che lo staff li
 * abbia già ricaricati a mano sulla scheda giusta, e portarli raddoppierebbe.
 */

function swap(
  ids: readonly Id<"players">[] | undefined,
  from: Id<"players">,
  into: Id<"players">,
): Id<"players">[] | undefined {
  if (!ids) return ids;
  return [...new Set(ids.map((id) => (id === from ? into : id)))];
}

async function moveBooking(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
  from: Id<"players">,
  into: Id<"players">,
) {
  const createdByPlayer =
    booking.createdByPlayer === from ? into : booking.createdByPlayer;

  await ctx.db.patch(booking._id, {
    createdByPlayer,
    // Chi prenota conta già come giocatore: tra i collegati sarebbe doppio.
    linkedPlayerIds: swap(booking.linkedPlayerIds, from, into)?.filter(
      (id) => id !== createdByPlayer,
    ),
    memberPlayers: booking.memberPlayers?.map((member) =>
      member.playerId === from ? { ...member, playerId: into } : member,
    ),
  });

  const match = await ctx.db
    .query("openMatches")
    .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
    .first();
  if (match) await moveMatch(ctx, match, from, into);

  // Riallinea chi gioca, la tariffa tesserati e i premi automatici.
  await bookingChanged(ctx, booking._id);
}

async function moveMatch(
  ctx: MutationCtx,
  match: Doc<"openMatches">,
  from: Id<"players">,
  into: Id<"players">,
) {
  if (match.creatorId !== from && !match.playerIds.includes(from)) return;
  await ctx.db.patch(match._id, {
    creatorId: match.creatorId === from ? into : match.creatorId,
    playerIds: swap(match.playerIds, from, into) ?? [],
  });
}

/** Il campo della scheda da tenere, o quello del doppione se lì manca. */
function fill<T>(kept: T | undefined, other: T | undefined): T | undefined {
  return kept === undefined || kept === "" ? other : kept;
}

const mergeArgs = {
  /** Il doppione: confluisce e poi viene eliminato. */
  fromId: v.id("players"),
  /** La scheda da tenere. */
  intoId: v.id("players"),
  points: v.union(v.literal("move"), v.literal("drop")),
};

/** Dalla scheda cliente della dashboard. */
export const merge = mutation({
  args: { secret: v.string(), ...mergeArgs },
  handler: async (ctx, { secret, ...args }) => {
    assertServer(secret);
    return await mergeCards(ctx, args);
  },
});

/** Dal terminale (`convex run`), per chi ha accesso al deployment. */
export const mergeByAdmin = internalMutation({
  args: mergeArgs,
  handler: async (ctx, args) => await mergeCards(ctx, args),
});

async function mergeCards(
  ctx: MutationCtx,
  {
    fromId,
    intoId,
    points,
  }: {
    fromId: Id<"players">;
    intoId: Id<"players">;
    points: "move" | "drop";
  },
) {
  if (fromId === intoId) {
    throw new ConvexError("Scegli un'altra scheda: è la stessa.");
  }

  const [from, into] = await Promise.all([
    ctx.db.get(fromId),
    ctx.db.get(intoId),
  ]);
  if (!from || !into) throw new ConvexError("Scheda non trovata.");

  if (from.clerkUserId) {
    throw new ConvexError(
      "Questa scheda è collegata a un account: unisci l'altra scheda a questa, non il contrario.",
    );
  }

  // Prenotazioni: dove ha prenotato, e dove gioca (l'indice non tiene le
  // annullate). Un insieme, perché spesso sono le stesse.
  const bookingIds = new Set<Id<"bookings">>();
  for (const booking of await ctx.db
    .query("bookings")
    .withIndex("by_created_by_player", (q) => q.eq("createdByPlayer", fromId))
    .collect()) {
    bookingIds.add(booking._id);
  }
  for (const row of await ctx.db
    .query("bookingPlayers")
    .withIndex("by_player", (q) => q.eq("playerId", fromId))
    .collect()) {
    bookingIds.add(row.bookingId);
  }

  for (const bookingId of bookingIds) {
    const booking = await ctx.db.get(bookingId);
    if (booking) await moveBooking(ctx, booking, fromId, intoId);
  }

  for (const match of await ctx.db
    .query("openMatches")
    .withIndex("by_creator", (q) => q.eq("creatorId", fromId))
    .collect()) {
    await moveMatch(ctx, match, fromId, intoId);
  }

  for (const membership of await ctx.db
    .query("memberships")
    .withIndex("by_player", (q) => q.eq("playerId", fromId))
    .collect()) {
    await ctx.db.patch(membership._id, { playerId: intoId });
  }

  // Un invito per il doppione non ha più dove portare.
  for (const invite of await ctx.db
    .query("clientInvites")
    .withIndex("by_player", (q) => q.eq("playerId", fromId))
    .collect()) {
    await ctx.db.delete(invite._id);
  }

  for (const report of await ctx.db
    .query("pointReports")
    .withIndex("by_player", (q) => q.eq("playerId", fromId))
    .collect()) {
    await ctx.db.patch(report._id, { playerId: intoId });
  }

  const transactions = await ctx.db
    .query("pointTransactions")
    .withIndex("by_player", (q) => q.eq("playerId", fromId))
    .collect();
  const redemptions = await ctx.db
    .query("rewardRedemptions")
    .withIndex("by_player", (q) => q.eq("playerId", fromId))
    .collect();

  if (points === "move") {
    for (const transaction of transactions) {
      await ctx.db.patch(transaction._id, {
        playerId: intoId,
        // La chiave dei premi automatici porta l'id della persona: con
        // quello vecchio, il premio verrebbe dato una seconda volta.
        autoKey: transaction.autoKey?.replaceAll(fromId, intoId),
      });
    }
    for (const redemption of redemptions) {
      await ctx.db.patch(redemption._id, { playerId: intoId });
    }
  } else {
    for (const transaction of transactions) {
      await ctx.db.delete(transaction._id);
    }
    for (const redemption of redemptions) {
      await ctx.db.delete(redemption._id);
    }
  }

  await ctx.db.delete(fromId);

  // Dopo l'eliminazione: l'email del doppione si può riusare solo quando
  // lui non c'è più.
  const phone = fill(into.phone, from.phone);
  const health = fill(into.health, from.health);
  await ctx.db.patch(intoId, {
    email: into.clerkUserId ? into.email : fill(into.email, from.email),
    phone,
    birthDate: fill(into.birthDate, from.birthDate),
    birthPlace: fill(into.birthPlace, from.birthPlace),
    gender:
      !into.gender || into.gender === "unspecified"
        ? (from.gender ?? into.gender)
        : into.gender,
    residence: fill(into.residence, from.residence),
    taxCode: fill(into.taxCode, from.taxCode),
    health,
    healthConsentAt:
      health === into.health ? into.healthConsentAt : from.healthConsentAt,
    clubNotes:
      [into.clubNotes, from.clubNotes].filter(Boolean).join("\n\n") ||
      undefined,
    existingClient: into.existingClient || from.existingClient || undefined,
    points:
      points === "move" ? (into.points ?? 0) + (from.points ?? 0) : into.points,
  });

  if (phone && phone !== into.phone) {
    await syncUpcomingPhone(ctx, intoId, phone);
  }
  await reconcileReferral(ctx, intoId);

  return { bookings: bookingIds.size };
}
