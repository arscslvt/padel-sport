import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { generatePlayerCode, getIdentityPlayer, requirePlayer } from "../openMatches/lib";
import { activeRule } from "../points/rules";

/**
 * Invitare un amico dall'area personale.
 *
 * La mail la manda il sito (app/api/referrals), che ha Resend e i modelli:
 * qui si registra l'invito e si restituisce quel che la mail deve dire.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Inviti al giorno per cliente: abbastanza per gli amici, troppo pochi per lo spam. */
const DAILY_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export const create = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    /** Estratto a caso dal sito: è il link della mail. */
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const inviter = await requirePlayer(ctx);
    if (inviter.suspension) {
      throw new Error("Il tuo account è sospeso: non puoi invitare amici.");
    }

    const email = args.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      throw new Error("Scrivi un indirizzo email valido.");
    }
    if (args.token.length < 32) throw new Error("Invito non valido.");

    const name = args.name?.trim().slice(0, 60) || undefined;

    // «Mai iscritto»: nessuna scheda del club con quella mail.
    const member = await ctx.db
      .query("players")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (member) {
      throw new Error(
        member._id === inviter._id
          ? "Questa è la tua mail."
          : "Questa persona è già iscritta al club.",
      );
    }

    const existing = await ctx.db
      .query("referrals")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing && existing.inviterId !== inviter._id) {
      throw new Error("Questa persona è già stata invitata da un altro cliente.");
    }

    const now = Date.now();
    const recent = await ctx.db
      .query("referrals")
      .withIndex("by_inviter", (q) =>
        q.eq("inviterId", inviter._id).gte("createdAt", now - DAY_MS),
      )
      .collect();
    const sentToday = recent.filter(
      (row) => (row.lastSentAt ?? row.createdAt) > now - DAY_MS,
    ).length;
    if (sentToday >= DAILY_LIMIT) {
      throw new Error("Per oggi hai invitato abbastanza amici. Riprova domani.");
    }

    const code = inviter.code ?? (await generatePlayerCode(ctx));
    if (!inviter.code) await ctx.db.patch(inviter._id, { code });

    // Rimandare lo stesso invito ruota il link: quello vecchio smette di valere.
    if (existing) {
      await ctx.db.patch(existing._id, {
        token: args.token,
        name: name ?? existing.name,
        lastSentAt: now,
        sentCount: (existing.sentCount ?? 1) + 1,
      });
    } else {
      await ctx.db.insert("referrals", {
        inviterId: inviter._id,
        email,
        name,
        token: args.token,
        status: "pending",
        createdAt: now,
        lastSentAt: now,
        sentCount: 1,
      });
    }

    const welcome = await activeRule(ctx, "referral_welcome");

    return {
      email,
      name,
      inviterName: inviter.name,
      code,
      resent: Boolean(existing),
      /** Quanti punti riceve l'amico alla prima tessera, se l'azione è accesa. */
      points: welcome?.points ?? null,
    };
  },
});

/**
 * La pagina a cui porta la mail. Pubblica, protetta solo dal token: dice chi
 * ha invitato, con quale mail iscriversi e il codice amico.
 */
export const byToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (token.length < 32) return null;

    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!referral) return null;

    const inviter = await ctx.db.get(referral.inviterId);
    if (!inviter) return null;

    const [welcome, reward] = await Promise.all([
      activeRule(ctx, "referral_welcome"),
      activeRule(ctx, "referral"),
    ]);

    return {
      /** Quanti punti riceve l'amico, se l'azione è accesa. */
      points: welcome?.points ?? null,
      /** Quanti ne riceve chi l'ha invitato. */
      inviterPoints: reward?.points ?? null,
      inviterName: inviter.firstName ?? inviter.name.split(" ")[0],
      email: referral.email,
      name: referral.name,
      code: inviter.code,
      joined: referral.status === "joined",
    };
  },
});

/** Gli amici invitati da chi guarda, e il suo codice amico. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return null;

    const rows = await ctx.db
      .query("referrals")
      .withIndex("by_inviter", (q) => q.eq("inviterId", player._id))
      .order("desc")
      .take(50);

    const [rule, welcome] = await Promise.all([
      activeRule(ctx, "referral"),
      activeRule(ctx, "referral_welcome"),
    ]);

    const invites = await Promise.all(
      rows.map(async (row) => {
        const invitee = row.inviteeId ? await ctx.db.get(row.inviteeId) : null;
        const award = row.inviteeId
          ? await ctx.db
              .query("pointTransactions")
              .withIndex("by_auto_key", (q) =>
                q.eq("autoKey", `referral:${row.inviteeId}`),
              )
              .first()
          : null;
        return {
          id: row._id,
          email: row.email,
          name: invitee?.name ?? row.name,
          status: award && !award.reversedAt ? ("rewarded" as const) : row.status,
          createdAt: row.createdAt,
        };
      }),
    );

    return {
      code: player.code,
      /** Quanti punti vale oggi un amico per chi invita, se l'azione è accesa. */
      points: rule?.points ?? null,
      /** Quanti ne riceve l'amico. */
      friendPoints: welcome?.points ?? null,
      invites,
    };
  },
});
