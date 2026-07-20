import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation, query } from "../../_generated/server";
import { addPlayerToMatch, requirePlayer, toPlayerView } from "./lib";

/** Invia una richiesta di partecipazione a una partita in modalità "request". */
export const request = mutation({
  args: { matchId: v.id("openMatches") },
  handler: async (ctx, { matchId }) => {
    const player = await requirePlayer(ctx);

    const match = await ctx.db.get(matchId);
    if (!match) {
      throw new Error("Partita non trovata.");
    }

    if (match.joinMode !== "request") {
      throw new Error("Questa partita è ad accesso libero: unisciti subito.");
    }

    if (match.status !== "open" || match.matchDate <= Date.now()) {
      throw new Error("La partita non è più aperta.");
    }

    if (match.playerIds.includes(player._id)) {
      throw new Error("Sei già in questa partita.");
    }

    if (player.level < match.levelMin || player.level > match.levelMax) {
      throw new Error(
        "Il tuo livello non rientra in quello richiesto dalla partita.",
      );
    }

    const existing = await ctx.db
      .query("joinRequests")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", matchId).eq("playerId", player._id),
      )
      .collect();

    if (existing.some((r) => r.status === "pending")) {
      throw new Error("Hai già inviato una richiesta per questa partita.");
    }

    const requestId = await ctx.db.insert("joinRequests", {
      matchId,
      playerId: player._id,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      {
        title: "Richiesta di partecipazione",
        message: `${player.name} chiede di unirsi alla partita del ${new Date(
          match.matchDate,
        ).toLocaleString("it-IT")}.`,
        tags: ["match", "request"],
      },
    );

    return requestId;
  },
});

/** Il creatore accetta o rifiuta una richiesta di partecipazione. */
export const respond = mutation({
  args: {
    requestId: v.id("joinRequests"),
    accept: v.boolean(),
  },
  handler: async (ctx, { requestId, accept }) => {
    const player = await requirePlayer(ctx);

    const joinRequest = await ctx.db.get(requestId);
    if (!joinRequest) {
      throw new Error("Richiesta non trovata.");
    }

    const match = await ctx.db.get(joinRequest.matchId);
    if (!match) {
      throw new Error("Partita non trovata.");
    }

    if (match.creatorId !== player._id) {
      throw new Error("Solo il creatore della partita può gestire le richieste.");
    }

    if (joinRequest.status !== "pending") {
      throw new Error("Questa richiesta è già stata gestita.");
    }

    if (!accept) {
      await ctx.db.patch(requestId, { status: "declined" });
      return requestId;
    }

    const requester = await ctx.db.get(joinRequest.playerId);
    if (!requester) {
      throw new Error("Il giocatore non esiste più.");
    }

    await addPlayerToMatch(ctx, match, requester);
    await ctx.db.patch(requestId, { status: "accepted" });

    return requestId;
  },
});

/** Richieste pendenti di una partita, visibili solo al creatore. */
export const listForMatch = query({
  args: { matchId: v.id("openMatches") },
  handler: async (ctx, { matchId }) => {
    const player = await requirePlayer(ctx);

    const match = await ctx.db.get(matchId);
    if (!match || match.creatorId !== player._id) {
      return [];
    }

    const pending = await ctx.db
      .query("joinRequests")
      .withIndex("by_match_status", (q) =>
        q.eq("matchId", matchId).eq("status", "pending"),
      )
      .collect();

    const withPlayers = await Promise.all(
      pending.map(async (request) => {
        const requester = await ctx.db.get(request.playerId);
        return requester
          ? { id: request._id, player: toPlayerView(requester) }
          : null;
      }),
    );

    return withPlayers.filter((r) => r !== null);
  },
});
