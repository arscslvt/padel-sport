import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server";
import { defaultClubId } from "../clubs/lib";
import { clubDayKey, clubMoment } from "../settings/lib";
import { applyPoints, balanceOf } from "./lib";
import {
  activeRule,
  isFirstMatchNewcomer,
  type PointRuleKey,
  ruleDefinition,
} from "./rules";
import { programState } from "./terms";
import { syncMemberPricing } from "../pricing/members";

/**
 * I punti che arrivano da soli: prima partita, tre partite in settimana,
 * pagamento online.
 *
 * Non c'è un evento «è successo X, dai Y punti». C'è una domanda che si rifà
 * ogni volta che una prenotazione cambia: **questa persona, oggi, dovrebbe
 * avere questo premio?** Se sì e non ce l'ha, glielo si dà; se no e ce l'ha,
 * lo si storna. È la stessa risposta qualunque sia la strada da cui si arriva
 * (conferma, annullamento, uscita dalla partita, rimborso, cambio d'orario), e
 * rifarla due volte non cambia niente.
 *
 * Ogni premio ha una chiave che dice il fatto da cui nasce
 * (`pointTransactions.autoKey`): `first_match:<giocatore>`,
 * `weekly_three:<giocatore>:<lunedì>`, `online_payment:<prenotazione>`.
 *
 * Spegnere un'azione ferma i premi nuovi ma non tocca quelli dati: lo storno
 * scatta solo se il fatto che li ha fatti nascere viene meno.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Il lunedì della settimana del club in cui cade l'istante, "AAAA-MM-GG". */
export function clubWeekKey(timestamp: number): string {
  const [year, month, day] = clubDayKey(timestamp).split("-").map(Number);
  const sinceMonday = (clubMoment(timestamp).weekday + 6) % 7;
  return new Date(Date.UTC(year, month - 1, day - sinceMonday))
    .toISOString()
    .slice(0, 10);
}

/** La fine della settimana del club, con l'approssimazione di un fuso. */
function weekEnd(weekKey: string): number {
  return Date.parse(`${weekKey}T00:00:00Z`) + 7 * DAY_MS;
}

/** "12/10" dal lunedì "2026-10-12": è la nota che il cliente legge. */
function weekLabel(weekKey: string): string {
  const [, month, day] = weekKey.split("-");
  return `Settimana del ${day}/${month}`;
}

// ---------------------------------------------------------------------------
// Chi gioca

/**
 * Le schede in campo per una prenotazione: dalla partita se c'è, se no da chi
 * ha prenotato e dai nomi che lo staff ha collegato.
 */
export async function participantsOf(
  ctx: QueryCtx,
  booking: Doc<"bookings">,
): Promise<Id<"players">[]> {
  if (booking.status === "cancelled") return [];

  const match = await ctx.db
    .query("openMatches")
    .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
    .first();

  const ids = match
    ? match.status === "cancelled"
      ? []
      : match.playerIds
    : [
        ...(booking.createdByPlayer ? [booking.createdByPlayer] : []),
        ...(booking.linkedPlayerIds ?? []),
      ];

  return [...new Set(ids)];
}

/**
 * Riallinea l'indice `bookingPlayers` di una prenotazione.
 *
 * Restituisce chi è toccato dal cambio (chi c'era e chi c'è) e le settimane
 * coinvolte: sono le sole su cui rifare i conti.
 */
export async function syncParticipants(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
): Promise<{ players: Id<"players">[]; weeks: string[] }> {
  const wanted = await participantsOf(ctx, booking);
  const confirmed = booking.status === "accepted_on_site_payment";

  const rows = await ctx.db
    .query("bookingPlayers")
    .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
    .collect();

  const weeks = new Set<string>([clubWeekKey(booking.bookingDate)]);
  const touched = new Set<Id<"players">>(wanted);

  for (const row of rows) {
    touched.add(row.playerId);
    weeks.add(clubWeekKey(row.bookingDate));

    if (!wanted.includes(row.playerId)) {
      await ctx.db.delete(row._id);
    } else if (
      row.bookingDate !== booking.bookingDate ||
      row.confirmed !== confirmed
    ) {
      await ctx.db.patch(row._id, {
        bookingDate: booking.bookingDate,
        confirmed,
      });
    }
  }

  for (const playerId of wanted) {
    if (rows.some((row) => row.playerId === playerId)) continue;
    await ctx.db.insert("bookingPlayers", {
      clubId: await defaultClubId(ctx),
      bookingId: booking._id,
      playerId,
      bookingDate: booking.bookingDate,
      bookingCreatedAt: booking.createdAt,
      confirmed,
    });
  }

  return { players: [...touched], weeks: [...weeks] };
}

// ---------------------------------------------------------------------------
// Dare e togliere

async function activeAward(ctx: QueryCtx, autoKey: string) {
  const rows = await ctx.db
    .query("pointTransactions")
    .withIndex("by_auto_key", (q) => q.eq("autoKey", autoKey))
    .collect();

  return rows.find((row) => !row.reversedAt && !row.reversalOf) ?? null;
}

/**
 * Dà il premio se non c'è già. A chi non ha aderito arriva in attesa, come i
 * punti caricati dallo staff (`applyPoints`). Con l'account sospeso i punti
 * sono congelati: niente premio, e lo si riconsidera al prossimo cambio.
 */
async function award(
  ctx: MutationCtx,
  args: {
    rule: Doc<"pointRules">;
    playerId: Id<"players">;
    autoKey: string;
    note?: string;
    /** Il nome del movimento, quando non è quello dell'azione. */
    label?: string;
  },
) {
  if (await activeAward(ctx, args.autoKey)) return;

  const player = await ctx.db.get(args.playerId);
  if (!player || player.suspension || player.deletion?.deletedAt) return;

  const { transactionId } = await applyPoints(ctx, {
    playerId: args.playerId,
    delta: args.rule.points,
    label: args.label ?? ruleDefinition(args.rule.key).label,
    note: args.note,
  });

  await ctx.db.patch(transactionId, {
    ruleKey: args.rule.key,
    autoKey: args.autoKey,
  });
}

/**
 * Storna il premio se c'è.
 *
 * In attesa non era ancora della persona: si cancella e basta, come fa lo
 * staff con un movimento in attesa sbagliato. Accreditato, si scrive un
 * movimento in uscita: mai oltre il saldo — se i punti sono già stati spesi
 * in un premio, il riscatto resta valido e il saldo non va sotto zero.
 *
 * Non passa da `applyPoints` perché lì togliere punti a chi non ha il
 * regolamento in vigore è vietato (allo staff si chiede di annullare il
 * movimento in attesa), mentre qui i punti erano stati accreditati davvero.
 */
async function revoke(ctx: MutationCtx, autoKey: string) {
  const transaction = await activeAward(ctx, autoKey);
  if (!transaction) return;

  if (transaction.pending) {
    await ctx.db.delete(transaction._id);
    return;
  }

  const player = await ctx.db.get(transaction.playerId);
  if (!player) return;

  // Congelati per la sospensione: lo storno aspetta la riattivazione. Una
  // scheda eliminata è solo una copia: non si tocca più.
  if (player.suspension || player.deletion?.deletedAt) return;

  const now = Date.now();
  const amount = Math.min(transaction.delta, balanceOf(player));

  // Chi è uscito dal programma ha già perso tutto il saldo.
  if (amount <= 0 || programState(player, now) === "left") {
    await ctx.db.patch(transaction._id, { reversedAt: now });
    return;
  }

  const balance = balanceOf(player) - amount;
  const reversalId = await ctx.db.insert("pointTransactions", {
    clubId: await defaultClubId(ctx),
    playerId: player._id,
    delta: -amount,
    label: `Storno: ${transaction.label}`,
    note:
      transaction.ruleKey === "referral_welcome"
        ? "La tua prima tessera non risulta più pagata."
        : transaction.ruleKey === "referral"
        ? "La tessera dell'amico che hai invitato non risulta più pagata."
        : "La prenotazione che li aveva fatti guadagnare non vale più.",
    ruleKey: transaction.ruleKey,
    reversalOf: transaction._id,
    balanceAfter: balance,
    createdAt: now,
  });

  await ctx.db.patch(transaction._id, { reversedAt: now });
  await ctx.db.patch(player._id, { points: balance });

  await ctx.scheduler.runAfter(0, internal.modules.points.mail.default, {
    transactionId: reversalId,
  });
}

async function settle(
  ctx: MutationCtx,
  rule: Doc<"pointRules"> | null,
  args: {
    deserved: boolean;
    playerId: Id<"players">;
    autoKey: string;
    note?: string;
    label?: string;
  },
) {
  if (!args.deserved) {
    await revoke(ctx, args.autoKey);
    return;
  }
  if (rule) await award(ctx, { rule, ...args });
}

// ---------------------------------------------------------------------------
// Le azioni

type Rules = Record<PointRuleKey, Doc<"pointRules"> | null>;

async function loadRules(ctx: QueryCtx): Promise<Rules> {
  const [
    first_match,
    weekly_three,
    online_payment,
    referral,
    referral_welcome,
  ] = await Promise.all([
    activeRule(ctx, "first_match"),
    activeRule(ctx, "weekly_three"),
    activeRule(ctx, "online_payment"),
    activeRule(ctx, "referral"),
    activeRule(ctx, "referral_welcome"),
  ]);
  return {
    first_match,
    weekly_three,
    online_payment,
    referral,
    referral_welcome,
  };
}

/**
 * Prima partita e tre partite in settimana, per una persona.
 *
 * Chi aveva già prenotazioni nate prima che «prima partita» partisse non è
 * alla prima: anche se la regola è spenta adesso, `since` resta quello del
 * giorno in cui è nata, e se non è mai stata configurata nessuno la merita.
 *
 * Le schede più vecchie dei clienti nuovi (`isFirstMatchNewcomer`) restano
 * fuori del tutto: il premio non si dà più, e quello già dato non si storna
 * nemmeno se la partita viene annullata. Lo staff ha corretto a mano quelli
 * sbagliati, e uno storno automatico toglierebbe i punti una seconda volta.
 */
async function reconcilePlayer(
  ctx: MutationCtx,
  rules: Rules,
  playerId: Id<"players">,
  weeks: string[],
) {
  const rows = await ctx.db
    .query("bookingPlayers")
    .withIndex("by_player", (q) => q.eq("playerId", playerId))
    .collect();
  const confirmed = rows.filter((row) => row.confirmed);

  const firstSince = (await ruleSince(ctx, "first_match")) ?? Infinity;
  const veteran = rows.some((row) => row.bookingCreatedAt < firstSince);
  const player = await ctx.db.get(playerId);
  if (player && isFirstMatchNewcomer(player)) {
    await settle(ctx, rules.first_match, {
      deserved: !veteran && confirmed.length > 0,
      playerId,
      autoKey: `first_match:${playerId}`,
    });
  }

  const weeklySince = (await ruleSince(ctx, "weekly_three")) ?? Infinity;
  for (const week of weeks) {
    // Le settimane chiuse prima che l'azione partisse non si premiano.
    if (weekEnd(week) <= weeklySince) continue;

    const played = confirmed.filter(
      (row) => clubWeekKey(row.bookingDate) === week,
    ).length;

    await settle(ctx, rules.weekly_three, {
      deserved: played >= 3,
      playerId,
      autoKey: `weekly_three:${playerId}:${week}`,
      note: weekLabel(week),
    });
  }
}

/**
 * Rifà i conti di «Prima partita» per una persona, senza aspettare che cambi
 * una prenotazione: serve quando lo staff corregge se era già cliente.
 */
export async function reconcileFirstMatch(
  ctx: MutationCtx,
  playerId: Id<"players">,
) {
  await reconcilePlayer(ctx, await loadRules(ctx), playerId, []);
}

async function ruleSince(ctx: QueryCtx, key: PointRuleKey) {
  const row = await ctx.db
    .query("pointRules")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  return row?.since;
}

/** Un punto a chi prenota, per ogni prenotazione pagata online. */
async function reconcileOnlinePayment(
  ctx: MutationCtx,
  rules: Rules,
  booking: Doc<"bookings">,
) {
  const playerId = booking.createdByPlayer;
  if (!playerId) return;

  const since = (await ruleSince(ctx, "online_payment")) ?? Infinity;
  if (booking.createdAt < since) return;

  await settle(ctx, rules.online_payment, {
    deserved:
      booking.status !== "cancelled" && booking.paymentMode === "online",
    playerId,
    autoKey: `online_payment:${booking._id}`,
  });
}

/**
 * I premi dell'amico invitato, due azioni con i loro punti: «Amico invitato»
 * a chi ha invitato, «Benvenuto da un amico» all'amico, entrambi con la prima
 * tessera pagata dell'amico. Tornano indietro a entrambi se quella tessera risulta non pagata o viene tolta (era un errore
 * allo sportello). Da chiamare dopo ogni cambio delle tessere di una persona e
 * quando la sua scheda nasce da un invito.
 *
 * All'amico, appena iscritto, i punti arrivano quasi sempre in attesa: non ha
 * ancora aderito al regolamento, e diventano suoi quando lo fa.
 */
export async function reconcileReferral(
  ctx: MutationCtx,
  inviteeId: Id<"players">,
): Promise<void> {
  const referral = await ctx.db
    .query("referrals")
    .withIndex("by_invitee", (q) => q.eq("inviteeId", inviteeId))
    .first();
  if (!referral || referral.inviterId === inviteeId) return;

  const paid = await ctx.db
    .query("memberships")
    .withIndex("by_player", (q) => q.eq("playerId", inviteeId))
    .collect();
  const deserved = paid.some((membership) => membership.paid);
  const [invitee, inviter] = await Promise.all([
    ctx.db.get(inviteeId),
    ctx.db.get(referral.inviterId),
  ]);
  // Ognuna conta dal giorno in cui è partita: un invito nato prima non la
  // fa scattare.
  const counts = async (key: "referral" | "referral_welcome") => {
    const since = await ruleSince(ctx, key);
    return since !== undefined && referral.createdAt >= since;
  };

  if (await counts("referral")) {
    await settle(ctx, await activeRule(ctx, "referral"), {
      deserved,
      playerId: referral.inviterId,
      autoKey: `referral:${inviteeId}`,
      note: invitee ? `Hai invitato ${invitee.name}` : undefined,
    });
  }

  // Il benvenuto vive dentro «Amico invitato»: spenta quella, spento anche lui.
  const welcome = (await activeRule(ctx, "referral"))
    ? await activeRule(ctx, "referral_welcome")
    : null;
  if (await counts("referral_welcome")) {
    await settle(ctx, welcome, {
      deserved,
      playerId: inviteeId,
      autoKey: `referred:${inviteeId}`,
      note: inviter ? `Ti ha invitato ${inviter.name}` : undefined,
    });
  }
}

/**
 * Riallinea chi gioca e rifà i conti dei premi per chi è toccato.
 *
 * Gira in una mutation sua, schedulata da `bookingChanged`: un errore nei
 * punti non deve far fallire una prenotazione, una conferma o un rimborso.
 */
export const onBookingChanged = internalMutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) return;

    const { players, weeks } = await syncParticipants(ctx, booking);
    const rules = await loadRules(ctx);

    for (const playerId of players) {
      await reconcilePlayer(ctx, rules, playerId, weeks);
    }

    await reconcileOnlinePayment(ctx, rules, booking);
  },
});

/**
 * Da chiamare dopo ogni cambio di una prenotazione: stato, squadra, orario,
 * pagamento. Chiamarla due volte nella stessa mutation non fa danni: i conti
 * rifatti danno la stessa risposta.
 */
export async function bookingChanged(
  ctx: MutationCtx,
  bookingId: Id<"bookings">,
): Promise<void> {
  // Chi gioca è cambiato: anche chi paga da tesserato può essere cambiato.
  await syncMemberPricing(ctx, bookingId);

  await ctx.scheduler.runAfter(
    0,
    internal.modules.points.auto.onBookingChanged,
    { bookingId },
  );
}
