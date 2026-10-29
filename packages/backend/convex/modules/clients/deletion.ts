import { ConvexError, v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Doc, Id, TableNames } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  clubMutation,
  clubQuery,
  internalAction,
  internalMutation,
  serverMutation,
} from "../../functions";
import { getIdentityPlayer, requirePlayer } from "../openMatches/lib";
import { bookingChanged } from "../points/auto";
import { clubMoment } from "../settings/lib";

/**
 * L'eliminazione dell'account di un cliente.
 *
 * Due strade. **Immediata**, solo dallo staff: l'account sparisce subito.
 * **Controllata**, dallo staff o dalla persona stessa nell'area personale:
 * parte un conto alla rovescia di trenta giorni, durante i quali l'account
 * funziona come sempre e la richiesta si può annullare; scaduti, diventa
 * effettiva da sola (`runDue`, convex/crons.ts).
 *
 * Effettiva vuol dire: l'utente Clerk viene cancellato (dal sito, che ne ha
 * le chiavi: `/api/account/deletion`), e la scheda resta congelata come copia
 * per un anno — tolti email, account e codice, che finiscono in
 * `deletion.backup`, così nessuna ricerca la trova e un nuovo accesso con la
 * stessa email crea una scheda nuova. Le prenotazioni da oggi in avanti
 * restano in agenda col nome scritto, scollegate. Dopo un anno `purgeDue`
 * toglie tutto.
 *
 * Le schede senza account hanno solo l'eliminazione immediata: non c'è
 * nessuno che possa annullarla.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Il tempo per ripensarci: è quello che scriviamo nella mail e nell'area personale. */
export const DELETION_GRACE_MS = 30 * DAY_MS;
/** Quanto resta la copia congelata. */
const BACKUP_MS = 365 * DAY_MS;
/** Schede rimosse del tutto per giro: ognuna tocca diverse tabelle. */
const PURGE_BATCH = 10;

export function isDeleted(player: Doc<"players">): boolean {
  return Boolean(player.deletion?.deletedAt);
}

/** Quel che serve alla mail, letto prima che la scheda perda email e account. */
function mailFacts(player: Doc<"players">) {
  return {
    firstName: player.firstName ?? player.name.split(" ")[0],
    email: player.email,
    clerkUserId: player.clerkUserId,
  };
}

async function notify(
  ctx: MutationCtx,
  kind: "requested" | "deleted",
  player: Doc<"players">,
  effectiveAt?: number,
) {
  const facts = mailFacts(player);
  // Senza email né account non c'è nessuno da avvisare, né niente su Clerk.
  if (!facts.email && !facts.clerkUserId) return;
  await ctx.scheduler.runAfter(0, internal.modules.clients.deletion.send, {
    kind,
    ...facts,
    effectiveAt,
    attempt: 0,
  });
}

/**
 * Rende effettiva l'eliminazione: scheda congelata, prenotazioni future
 * scollegate, inviti in sospeso tolti, e il sito avvisato perché cancelli
 * l'utente Clerk e scriva alla persona.
 */
async function freeze(ctx: MutationCtx, player: Doc<"players">) {
  const now = Date.now();
  const startOfToday = now - clubMoment(now).minutes * 60_000 - (now % 60_000);

  // Prima di toccare la scheda: dopo, email e account non ci sono più.
  await notify(ctx, "deleted", player);

  const touched = new Set<Id<"bookings">>();
  for (const booking of await ctx.db
    .query("bookings")
    .withIndex("by_created_by_player", (q) =>
      q.eq("createdByPlayer", player._id).gte("bookingDate", startOfToday),
    )
    .collect()) {
    touched.add(booking._id);
  }
  for (const row of await ctx.db
    .query("bookingPlayers")
    .withIndex("by_player", (q) =>
      q.eq("playerId", player._id).gte("bookingDate", startOfToday),
    )
    .collect()) {
    touched.add(row.bookingId);
  }
  for (const bookingId of touched) {
    const booking = await ctx.db.get(bookingId);
    if (!booking) continue;
    await ctx.db.patch(bookingId, {
      createdByPlayer:
        booking.createdByPlayer === player._id
          ? undefined
          : booking.createdByPlayer,
      linkedPlayerIds: booking.linkedPlayerIds?.filter(
        (id) => id !== player._id,
      ),
      memberPlayers: booking.memberPlayers?.filter(
        (member) => member.playerId !== player._id,
      ),
    });
    await bookingChanged(ctx, bookingId);
  }

  for (const invite of await ctx.db
    .query("clientInvites")
    .withIndex("by_player", (q) => q.eq("playerId", player._id))
    .collect()) {
    await ctx.db.delete(invite._id);
  }

  await ctx.db.patch(player._id, {
    deletion: {
      requestedAt: player.deletion?.requestedAt ?? now,
      requestedBy: player.deletion?.requestedBy ?? "staff",
      requestedByClerkUserId: player.deletion?.requestedByClerkUserId,
      effectiveAt: Math.min(player.deletion?.effectiveAt ?? now, now),
      deletedAt: now,
      purgeAt: now + BACKUP_MS,
      backup: {
        clerkUserId: player.clerkUserId,
        email: player.email,
        code: player.code,
      },
    },
    clerkUserId: undefined,
    email: undefined,
    code: undefined,
  });
}

/** Avvia la cancellazione controllata, se si può. */
async function schedule(
  ctx: MutationCtx,
  player: Doc<"players">,
  requestedBy: "self" | "staff",
  requestedByClerkUserId?: string,
) {
  if (isDeleted(player)) throw new ConvexError("Questa scheda è già eliminata.");
  if (player.deletion) {
    throw new ConvexError("La cancellazione di questo account è già avviata.");
  }
  if (!player.clerkUserId) {
    throw new ConvexError(
      "Questa scheda non ha un account: non c'è nessuno che possa annullare la richiesta. Eliminala subito.",
    );
  }

  const now = Date.now();
  const effectiveAt = now + DELETION_GRACE_MS;
  await ctx.db.patch(player._id, {
    deletion: { requestedAt: now, requestedBy, requestedByClerkUserId, effectiveAt },
  });
  await notify(ctx, "requested", player, effectiveAt);
  return { effectiveAt };
}

// ---------------------------------------------------------------------------
// Dallo staff

export const request = serverMutation({
  args: {
    playerId: v.id("players"),
    mode: v.union(v.literal("now"), v.literal("scheduled")),
    staffClerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, { playerId, mode, staffClerkUserId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("Scheda non trovata.");

    if (mode === "scheduled") {
      return await schedule(ctx, player, "staff", staffClerkUserId);
    }

    if (isDeleted(player)) {
      throw new ConvexError("Questa scheda è già eliminata.");
    }
    // Una richiesta controllata in corso si può accelerare: resta scritto chi
    // l'aveva chiesta.
    if (!player.deletion) {
      await ctx.db.patch(playerId, {
        deletion: {
          requestedAt: Date.now(),
          requestedBy: "staff",
          requestedByClerkUserId: staffClerkUserId,
          effectiveAt: Date.now(),
        },
      });
    }
    const updated = await ctx.db.get(playerId);
    if (updated) await freeze(ctx, updated);
    return { effectiveAt: Date.now() };
  },
});

export const cancel = serverMutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("Scheda non trovata.");
    if (!player.deletion) {
      throw new ConvexError("Non c'è nessuna cancellazione da annullare.");
    }
    if (isDeleted(player)) {
      throw new ConvexError("L'account è già stato eliminato: non si recupera.");
    }
    await ctx.db.patch(playerId, { deletion: undefined });
  },
});

// ---------------------------------------------------------------------------
// Dall'area personale

/** La richiesta in corso della persona collegata, se c'è. */
export const mine = clubQuery({
  args: {},
  handler: async (ctx) => {
    const player = await getIdentityPlayer(ctx, ctx.club._id);
    if (!player?.deletion || isDeleted(player)) return null;
    return {
      requestedAt: player.deletion.requestedAt,
      requestedBy: player.deletion.requestedBy,
      effectiveAt: player.deletion.effectiveAt,
    };
  },
});

export const requestMine = clubMutation({
  args: {},
  handler: async (ctx) => {
    const player = await requirePlayer(ctx, ctx.club._id);
    return await schedule(ctx, player, "self", player.clerkUserId);
  },
});

export const cancelMine = clubMutation({
  args: {},
  handler: async (ctx) => {
    const player = await requirePlayer(ctx, ctx.club._id);
    if (!player.deletion || isDeleted(player)) {
      throw new ConvexError("Non c'è nessuna cancellazione da annullare.");
    }
    await ctx.db.patch(player._id, { deletion: undefined });
  },
});

// ---------------------------------------------------------------------------
// Da soli (convex/crons.ts)

/** Le cancellazioni controllate arrivate alla scadenza diventano effettive. */
export const runDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("players")
      .withIndex("by_deletion_effective", (q) =>
        q.gt("deletion.effectiveAt", 0).lte("deletion.effectiveAt", now),
      )
      .collect();

    for (const player of due) {
      if (!isDeleted(player)) await freeze(ctx, player);
    }
  },
});

/** Le copie congelate da più di un anno se ne vanno del tutto. */
export const purgeDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("players")
      .withIndex("by_deletion_purge", (q) =>
        q.gt("deletion.purgeAt", 0).lte("deletion.purgeAt", now),
      )
      .take(PURGE_BATCH);

    for (const player of due) await purge(ctx, player._id);

    if (due.length === PURGE_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.clients.deletion.purgeDue,
        {},
      );
    }
  },
});

/**
 * Dal terminale (`convex run`), per chi ha accesso al deployment: la copia
 * di un account eliminato se ne va subito, senza aspettare l'anno. È quello
 * che l'informativa privacy promette a chi lo chiede per email.
 */
export const purgeByAdmin = internalMutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("Scheda non trovata.");
    if (!isDeleted(player)) {
      throw new ConvexError(
        "La scheda non è ancora eliminata: prima va eliminato l'account.",
      );
    }
    await purge(ctx, playerId);
  },
});

/**
 * Toglie la scheda e ciò che è solo suo. Le prenotazioni restano al club col
 * nome scritto; le partite create da lei passano a un altro giocatore, o se
 * ne vanno se era sola. I pagamenti online restano: sono documenti contabili.
 */
async function purge(ctx: MutationCtx, playerId: Id<"players">) {
  const byPlayer = async (rows: { _id: Id<TableNames> }[]) => {
    for (const row of rows) await ctx.db.delete(row._id);
  };

  for (const booking of await ctx.db
    .query("bookings")
    .withIndex("by_created_by_player", (q) => q.eq("createdByPlayer", playerId))
    .collect()) {
    await ctx.db.patch(booking._id, { createdByPlayer: undefined });
  }

  const rows = await ctx.db
    .query("bookingPlayers")
    .withIndex("by_player", (q) => q.eq("playerId", playerId))
    .collect();
  for (const row of rows) {
    const booking = await ctx.db.get(row.bookingId);
    if (booking) {
      await ctx.db.patch(booking._id, {
        linkedPlayerIds: booking.linkedPlayerIds?.filter((id) => id !== playerId),
        memberPlayers: booking.memberPlayers?.filter(
          (member) => member.playerId !== playerId,
        ),
      });
      const match = await ctx.db
        .query("openMatches")
        .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
        .first();
      if (match?.playerIds.includes(playerId)) {
        await ctx.db.patch(match._id, {
          playerIds: match.playerIds.filter((id) => id !== playerId),
        });
      }
    }
    await ctx.db.delete(row._id);
  }

  for (const match of await ctx.db
    .query("openMatches")
    .withIndex("by_creator", (q) => q.eq("creatorId", playerId))
    .collect()) {
    const others = match.playerIds.filter((id) => id !== playerId);
    if (others.length > 0) {
      await ctx.db.patch(match._id, { creatorId: others[0], playerIds: others });
    } else {
      await ctx.db.delete(match._id);
    }
  }

  await byPlayer(
    await ctx.db
      .query("memberships")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect(),
  );
  await byPlayer(
    await ctx.db
      .query("pointTransactions")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect(),
  );
  await byPlayer(
    await ctx.db
      .query("rewardRedemptions")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect(),
  );
  await byPlayer(
    await ctx.db
      .query("pointReports")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect(),
  );
  await byPlayer(
    await ctx.db
      .query("pointsExitRequests")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect(),
  );
  await byPlayer(
    await ctx.db
      .query("joinRequests")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect(),
  );
  await byPlayer(
    await ctx.db
      .query("matchInvites")
      .withIndex("by_player_status", (q) => q.eq("playerId", playerId))
      .collect(),
  );
  await byPlayer(
    await ctx.db
      .query("circleMembers")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect(),
  );
  await byPlayer(
    await ctx.db
      .query("circleInvites")
      .withIndex("by_invitee_status", (q) => q.eq("inviteeId", playerId))
      .collect(),
  );
  for (const circle of await ctx.db
    .query("circles")
    .withIndex("by_owner", (q) => q.eq("ownerId", playerId))
    .collect()) {
    await byPlayer(
      await ctx.db
        .query("circleMembers")
        .withIndex("by_circle", (q) => q.eq("circleId", circle._id))
        .collect(),
    );
    await byPlayer(
      await ctx.db
        .query("circleInvites")
        .withIndex("by_circle_status", (q) => q.eq("circleId", circle._id))
        .collect(),
    );
    await ctx.db.delete(circle._id);
  }
  await byPlayer(
    await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", playerId))
      .collect(),
  );
  await byPlayer(
    await ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", playerId))
      .collect(),
  );
  await byPlayer(
    await ctx.db
      .query("referrals")
      .withIndex("by_inviter", (q) => q.eq("inviterId", playerId))
      .collect(),
  );
  await byPlayer(
    await ctx.db
      .query("referrals")
      .withIndex("by_invitee", (q) => q.eq("inviteeId", playerId))
      .collect(),
  );

  await ctx.db.delete(playerId);
}

// ---------------------------------------------------------------------------
// Il sito: Clerk e mail

/** Ogni quanto riprovare se il sito non risponde, e per quante volte. */
const RETRY_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 24;

export const send = internalAction({
  args: {
    kind: v.union(v.literal("requested"), v.literal("deleted")),
    firstName: v.string(),
    email: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    effectiveAt: v.optional(v.float64()),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const siteUrl = process.env.SITE_URL;
    const secret = process.env.BOOKING_WEBHOOK_SECRET;
    if (!siteUrl || !secret) {
      console.error(
        "Eliminazione account non comunicata al sito: manca SITE_URL o BOOKING_WEBHOOK_SECRET sul deployment Convex.",
      );
      return;
    }

    const { attempt, ...body } = args;
    try {
      const response = await fetch(`${siteUrl}/api/account/deletion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-booking-webhook-secret": secret,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      console.error("Eliminazione account non comunicata al sito:", error);
      // Per un'eliminazione effettiva non è solo una mail: finché il sito non
      // risponde l'utente Clerk esiste ancora. Si riprova.
      if (args.kind === "deleted" && attempt + 1 < MAX_ATTEMPTS) {
        await ctx.scheduler.runAfter(
          RETRY_MS,
          internal.modules.clients.deletion.send,
          { ...args, attempt: attempt + 1 },
        );
      }
    }
  },
});
