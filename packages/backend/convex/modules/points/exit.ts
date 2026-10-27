import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import { defaultClubId } from "../clubs/lib";
import { requirePlayer } from "../openMatches/lib";
import { balanceOf, closeExit, creditPending, exitDeadline } from "./lib";
import { programState } from "./terms";

/**
 * L'uscita dal programma punti, come la descrive il regolamento (sezione 8).
 *
 * Esce solo la persona, e solo dopo aver letto cosa succede ai suoi punti: o
 * dall'area personale, o dalla pagina a cui porta il link che la segreteria le
 * manda via mail quando chiede di uscire. Lo staff non ha un pulsante per
 * farla uscire, né per annullare un'uscita: i punti sono suoi, e così lo è la
 * scelta.
 *
 * Da quel momento i punti nuovi restano in attesa (lib.ts), ma quelli che ha
 * restano suoi per dieci giorni, in cui può ancora riscattarli. Alla scadenza
 * decadono e il conto si chiude (`closeExit`). Fino ad allora può ripensarci
 * e restare.
 */

/** Il link della mail vale una settimana: poi la segreteria ne manda un altro. */
const REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function startExit(
  ctx: MutationCtx,
  player: Doc<"players">,
  via: "online" | "email",
) {
  const state = programState(player);
  if (state === "leaving") {
    throw new Error("Hai già chiesto di uscire dal programma.");
  }
  if (state === "none" || state === "left" || !player.pointsProgram) {
    throw new Error("Non risulti iscritto al programma punti.");
  }

  const requestedAt = Date.now();

  await ctx.db.patch(player._id, {
    pointsProgram: { ...player.pointsProgram, exit: { requestedAt, via } },
  });

  // Il conto si chiude da solo alla scadenza. Il controllo quotidiano
  // (expire.ts) ripassa comunque, se il timer dovesse mancare.
  await ctx.scheduler.runAt(
    exitDeadline({ requestedAt }),
    internal.modules.points.exit.close,
    { playerId: player._id, requestedAt },
  );

  // Una richiesta della segreteria ancora aperta non serve più.
  for (const request of await pendingRequests(ctx, player._id)) {
    await ctx.db.patch(request._id, { status: "revoked" });
  }

  return { deadline: exitDeadline({ requestedAt }), balance: balanceOf(player) };
}

async function pendingRequests(ctx: MutationCtx, playerId: Doc<"players">["_id"]) {
  const rows = await ctx.db
    .query("pointsExitRequests")
    .withIndex("by_player", (q) => q.eq("playerId", playerId))
    .collect();
  return rows.filter((row) => row.status === "pending");
}

/** La persona esce dalla propria area personale. */
export const leave = mutation({
  args: {},
  handler: async (ctx) => {
    const player = await requirePlayer(ctx);

    // Da sospesa non potrebbe riscattare nei dieci giorni: prima va
    // riattivato l'account.
    if (player.suspension) {
      throw new Error(
        "Il tuo account è sospeso. Per uscire dal programma scrivi alla segreteria.",
      );
    }

    return await startExit(ctx, player, "online");
  },
});

/**
 * Ci ha ripensato: resta nel programma.
 *
 * Si torna dov'eri: con il regolamento in vigore si riprende a ricevere punti,
 * compresi quelli caricati nei giorni dell'uscita, che erano rimasti in
 * attesa. Con un regolamento vecchio resta da accettare quello nuovo.
 */
export const stay = mutation({
  args: {},
  handler: async (ctx) => {
    const player = await requirePlayer(ctx);

    if (programState(player) !== "leaving" || !player.pointsProgram) {
      throw new Error("Non c'è un'uscita dal programma da annullare.");
    }

    const { exit: _exit, ...program } = player.pointsProgram;
    await ctx.db.patch(player._id, { pointsProgram: program });

    const updated = await ctx.db.get(player._id);
    if (updated && programState(updated) === "joined") {
      return await creditPending(ctx, player._id);
    }
    return { credited: 0, points: 0 };
  },
});

/**
 * La segreteria registra la richiesta di uscita e ne riceve il link.
 *
 * La mail la manda il gestionale (app/api/dashboard/clients/[playerId]/points/
 * program/exit), che genera anche il token: qui si controlla che la persona
 * sia davvero nel programma e si ritirano le richieste precedenti.
 */
export const requestByEmail = mutation({
  args: {
    secret: v.string(),
    playerId: v.id("players"),
    token: v.string(),
    email: v.string(),
    sentByClerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Cliente non trovato.");

    const state = programState(player);
    if (state === "leaving" || state === "left") {
      throw new Error("Questa persona è già uscita dal programma.");
    }
    if (state === "none") {
      throw new Error("Questa persona non ha aderito al programma punti.");
    }
    if (player.suspension) {
      throw new Error(
        "L'account è sospeso: riattivalo prima, così nei dieci giorni potrà riscattare.",
      );
    }

    for (const request of await pendingRequests(ctx, args.playerId)) {
      await ctx.db.patch(request._id, { status: "revoked" });
    }

    const now = Date.now();
    const expiresAt = now + REQUEST_TTL_MS;

    await ctx.db.insert("pointsExitRequests", {
      clubId: await defaultClubId(ctx),
      playerId: args.playerId,
      token: args.token,
      email: args.email,
      status: "pending",
      sentByClerkUserId: args.sentByClerkUserId,
      createdAt: now,
      expiresAt,
    });

    return {
      firstName: player.firstName ?? player.name.split(" ")[0],
      balance: balanceOf(player),
      expiresAt,
    };
  },
});

/**
 * La pagina del link: chi è, quanti punti ha, e se il link vale ancora.
 *
 * È una lettura pubblica protetta dal solo token, come quella degli inviti:
 * restituisce il nome e il saldo di chi ha la mail, niente di più.
 */
export const requestByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const request = await ctx.db
      .query("pointsExitRequests")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!request) return null;

    const player = await ctx.db.get(request.playerId);
    if (!player) return null;

    const now = Date.now();
    const exit = player.pointsProgram?.exit;

    const status =
      request.status === "confirmed"
        ? "confirmed"
        : request.status === "revoked"
          ? "revoked"
          : request.expiresAt <= now
            ? "expired"
            : "pending";

    return {
      status,
      firstName: player.firstName ?? player.name.split(" ")[0],
      balance: balanceOf(player),
      // Dopo la conferma la pagina dice fino a quando si riscatta.
      deadline:
        status === "confirmed" && exit ? exitDeadline(exit) : undefined,
    };
  },
});

/** La persona conferma l'uscita dalla pagina del link. */
export const confirmByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const request = await ctx.db
      .query("pointsExitRequests")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!request || request.status === "revoked") {
      throw new Error(
        "Questo link non è più valido. Chiedi alla segreteria di mandartene un altro.",
      );
    }
    if (request.status === "confirmed") {
      throw new Error("Hai già confermato l'uscita dal programma.");
    }
    if (request.expiresAt <= Date.now()) {
      throw new Error(
        "Questo link è scaduto. Chiedi alla segreteria di mandartene un altro.",
      );
    }

    const player = await ctx.db.get(request.playerId);
    if (!player) throw new Error("Scheda non trovata.");
    if (player.suspension) {
      throw new Error(
        "Il tuo account è sospeso. Per uscire dal programma scrivi alla segreteria.",
      );
    }

    const result = await startExit(ctx, player, "email");

    // `startExit` ha ritirato le richieste aperte, questa compresa: si
    // riscrive come confermata, che è quel che è successo davvero.
    await ctx.db.patch(request._id, {
      status: "confirmed",
      confirmedAt: Date.now(),
    });

    return result;
  },
});

/**
 * Il timer dell'uscita: alla scadenza chiude il conto.
 *
 * `requestedAt` lega il timer alla sua uscita: se la persona è rimasta e poi
 * è uscita di nuovo, il timer vecchio non deve chiudere quella nuova in
 * anticipo.
 */
export const close = internalMutation({
  args: { playerId: v.id("players"), requestedAt: v.float64() },
  handler: async (ctx, { playerId, requestedAt }) => {
    const player = await ctx.db.get(playerId);
    if (player?.pointsProgram?.exit?.requestedAt !== requestedAt) return null;

    return await closeExit(ctx, playerId);
  },
});
