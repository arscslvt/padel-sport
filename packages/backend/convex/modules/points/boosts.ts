import { query } from "../../_generated/server";
import { getIdentityPlayer } from "../openMatches/lib";
import { clubWeekKey } from "./auto";
import { activeRule } from "./rules";

/**
 * Come guadagnare punti, visto da chi guarda: le azioni premiate accese, con
 * i punti di oggi e a che punto è la persona.
 *
 * Serve alla sezione «Fai crescere i tuoi punti» dell'area personale. Una
 * tile per azione, e solo per quelle accese: un'azione spenta non si promette.
 *
 * La partita vinta non è un'azione automatica: la carica lo staff con il
 * preset che ha quel nome. Se il preset c'è, se ne mostrano i punti.
 */

const WEEKLY_TARGET = 3;

export default query({
  handler: async (ctx) => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return null;

    const [firstMatch, weekly, online, referral, welcome] = await Promise.all([
      activeRule(ctx, "first_match"),
      activeRule(ctx, "weekly_three"),
      activeRule(ctx, "online_payment"),
      activeRule(ctx, "referral"),
      activeRule(ctx, "referral_welcome"),
    ]);

    const automatic = (
      await ctx.db
        .query("pointTransactions")
        .withIndex("by_player", (q) => q.eq("playerId", player._id))
        .collect()
    ).filter((row) => row.autoKey && !row.reversedAt);
    const awards = (prefix: string) =>
      automatic.filter((row) => row.autoKey?.startsWith(prefix));

    const rows = await ctx.db
      .query("bookingPlayers")
      .withIndex("by_player", (q) => q.eq("playerId", player._id))
      .collect();

    // Prima partita: si promette solo a chi non ha ancora nessuna
    // prenotazione, nemmeno in attesa di conferma. Chi ha già prenotato l'ha
    // già avuta, la sta per avere o non può averla (giocava prima che
    // l'azione partisse): in tutti e tre i casi la tile non ha niente da dirgli.
    const firstAvailable =
      rows.length === 0 && awards(`first_match:${player._id}`).length === 0;

    const week = clubWeekKey(Date.now());
    const playedThisWeek = rows.filter(
      (row) => row.confirmed && clubWeekKey(row.bookingDate) === week,
    ).length;
    const weekDone = awards(`weekly_three:${player._id}:${week}`).length > 0;

    const invited = await ctx.db
      .query("referrals")
      .withIndex("by_inviter", (q) => q.eq("inviterId", player._id))
      .collect();
    const rewarded = awards("referral:").length;

    // Il preset «Partita vinta» (o come l'ha rinominato il club).
    const presets = await ctx.db
      .query("pointPresets")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .collect();
    const won = presets.find(
      (preset) => preset.points > 0 && /vint/i.test(preset.label),
    );

    return {
      wonMatch: won ? { label: won.label, points: won.points } : null,
      firstMatch:
        firstMatch && firstAvailable ? { points: firstMatch.points } : null,
      weekly: weekly
        ? {
            points: weekly.points,
            target: WEEKLY_TARGET,
            played: Math.min(playedThisWeek, WEEKLY_TARGET),
            done: weekDone,
          }
        : null,
      onlinePayment: online ? { points: online.points } : null,
      referral: referral
        ? {
            points: referral.points,
            friendPoints: welcome?.points ?? null,
            invited: invited.length,
            rewarded,
          }
        : null,
    };
  },
});
