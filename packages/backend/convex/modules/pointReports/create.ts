import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { clubMutation } from "../../functions";
import { pointReportCategory } from "../../tables/pointReports";
import { excerpt } from "../../utils/hark";
import { staffPointReportUrl } from "../../utils/staffLinks";
import { requirePlayer } from "../openMatches/lib";
import { CATEGORY_LABELS, MAX_MESSAGE, MIN_MESSAGE } from "./lib";

/** Oltre, chi scrive sta usando il modulo come una chat: meglio telefonare. */
const MAX_OPEN_PER_PLAYER = 5;

/**
 * Registra una segnalazione sui punti dall'area personale.
 *
 * Chi scrive è autenticato, quindi non chiede recapiti: lo staff li legge
 * dalla scheda del giocatore. Il movimento, se c'è, deve essere suo — l'id
 * arriva dal browser e da solo non prova niente.
 */
export default clubMutation({
  args: {
    transactionId: v.optional(v.id("pointTransactions")),
    category: pointReportCategory,
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await requirePlayer(ctx);

    const message = args.message.trim();
    if (message.length < MIN_MESSAGE) {
      throw new Error(
        "Raccontaci qualcosa in più, così sappiamo cosa cercare.",
      );
    }
    if (message.length > MAX_MESSAGE) {
      throw new Error(
        `Il messaggio è troppo lungo: resta sotto i ${MAX_MESSAGE} caratteri.`,
      );
    }

    const transaction = args.transactionId
      ? await ctx.db.get(args.transactionId)
      : null;
    if (args.transactionId && transaction?.playerId !== player._id) {
      throw new Error("Movimento non trovato.");
    }

    const open = await ctx.db
      .query("pointReports")
      .withIndex("by_player", (q) => q.eq("playerId", player._id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "new"),
          q.eq(q.field("status"), "in_progress"),
        ),
      )
      .collect();
    if (open.length >= MAX_OPEN_PER_PLAYER) {
      throw new Error(
        "Hai già diverse segnalazioni aperte: ti rispondiamo su quelle prima.",
      );
    }

    const reportId = await ctx.db.insert("pointReports", {
      clubId: ctx.club._id,
      playerId: player._id,
      transactionId: transaction?._id,
      category: args.category,
      message,
      status: "new",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      {
        category: "requests",
        title: `Punti: ${player.name}`,
        message: [
          CATEGORY_LABELS[args.category],
          transaction
            ? `Movimento: ${transaction.label} (${transaction.delta > 0 ? "+" : ""}${transaction.delta})`
            : null,
          "",
          excerpt(message),
        ]
          .filter((line) => line !== null)
          .join("\n"),
        url: staffPointReportUrl(reportId),
        idempotencyKey: `point-report-${reportId}`,
      },
    );

    return reportId;
  },
});
