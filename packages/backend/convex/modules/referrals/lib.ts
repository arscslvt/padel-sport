import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { reconcileReferral } from "../points/auto";

/**
 * Riconosce l'amico invitato quando lo staff apre la sua scheda allo
 * sportello: dal codice amico che ha dato, o dalla mail con cui è stato
 * invitato. Il codice vince, perché è una scelta detta a voce in quel
 * momento; la mail è il caso in cui l'amico non lo ricorda.
 *
 * Restituisce chi l'ha invitato, o `null` se la scheda non nasce da un invito.
 */
export async function attachReferral(
  ctx: MutationCtx,
  invitee: { _id: Id<"players">; email?: string; clubId?: Id<"clubs"> },
  code: string | undefined,
): Promise<Id<"players"> | null> {
  const now = Date.now();
  const email = invitee.email?.toLowerCase();

  let inviterId: Id<"players"> | null = null;
  if (code?.trim()) {
    const inviter = await ctx.db
      .query("players")
      .withIndex("by_code", (q) => q.eq("code", code.trim()))
      .first();
    if (!inviter || inviter._id === invitee._id) {
      throw new Error("Il codice amico non corrisponde a nessun cliente.");
    }
    inviterId = inviter._id;
  }

  const invited = email
    ? await ctx.db
        .query("referrals")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect()
    : [];
  const pending = invited.filter((row) => row.status === "pending");

  // L'invito via mail di chi ha dato il codice, se c'è; se no il primo
  // arrivato, quando il codice non è stato detto.
  const match =
    (inviterId
      ? pending.find((row) => row.inviterId === inviterId)
      : pending.sort((a, b) => a.createdAt - b.createdAt)[0]) ?? null;

  if (match) {
    await ctx.db.patch(match._id, {
      status: "joined",
      inviteeId: invitee._id,
      joinedAt: now,
    });
  } else if (inviterId) {
    await ctx.db.insert("referrals", {
      clubId: invitee.clubId,
      inviterId,
      email,
      status: "joined",
      inviteeId: invitee._id,
      createdAt: now,
      joinedAt: now,
    });
  } else {
    return null;
  }

  // Gli altri inviti alla stessa persona non hanno più niente da aspettare.
  for (const row of pending) {
    if (row._id !== match?._id) await ctx.db.delete(row._id);
  }

  await reconcileReferral(ctx, invitee._id);
  return match?.inviterId ?? inviterId;
}
