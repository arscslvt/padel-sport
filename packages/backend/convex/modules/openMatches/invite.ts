import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { mutation } from "../../_generated/server";
import {
  invitesOf,
  occupancyOf,
  requirePlayer,
  syncMatchStatus,
} from "./lib";

export interface InviteOutcome {
  /** Inviti effettivamente creati. */
  invited: number;
  /** Nomi di chi era già dentro o aveva già un invito in sospeso. */
  skipped: string[];
}

/**
 * Invita per nome dei giocatori dell'app a una partita.
 *
 * A differenza della diffusione a una cerchia, questi inviti **tengono il
 * posto** finché l'invitato non risponde: è il senso di chiamare qualcuno,
 * non farselo soffiare da uno sconosciuto mentre ci pensa.
 *
 * Chi è già in partita o ha già un invito aperto viene saltato in silenzio,
 * come fa `modules/circles/invite.ts`: una lista non deve fallire tutta per
 * colpa di un nome già presente. I posti finiti invece sono un errore vero,
 * perché cambierebbe il risultato atteso dall'utente.
 */
export async function inviteToMatch(
  ctx: MutationCtx,
  match: Doc<"openMatches">,
  playerIds: Id<"players">[],
): Promise<InviteOutcome> {
  const invites = await invitesOf(ctx, match._id);

  // Una riga per persona: chi era già stato invitato e aveva detto di no la
  // ritrova riportata in sospeso. Inserirne una seconda lascerebbe due inviti
  // per la stessa persona — che l'elenco mostrerebbe due volte, e che le
  // letture per coppia (partita, giocatore) non saprebbero più distinguere.
  const existingByPlayer = new Map(
    invites.map((invite) => [invite.playerId, invite]),
  );

  const outcome: InviteOutcome = { invited: 0, skipped: [] };
  let { free } = await occupancyOf(ctx, match);

  // I duplicati nella lista in arrivo non devono generare due inviti
  for (const playerId of new Set(playerIds)) {
    const target = await ctx.db.get(playerId);
    if (!target) continue;

    const existing = existingByPlayer.get(playerId);

    if (match.playerIds.includes(playerId) || existing?.status === "pending") {
      outcome.skipped.push(target.name);
      continue;
    }

    if (free <= 0) {
      throw new Error(
        "Non ci sono più posti liberi in questa partita: liberane uno prima di invitare.",
      );
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        kind: "direct",
        status: "pending",
        createdAt: Date.now(),
        respondedAt: undefined,
      });
    } else {
      await ctx.db.insert("matchInvites", {
        matchId: match._id,
        playerId,
        kind: "direct",
        circleId: match.circleId,
        status: "pending",
        createdAt: Date.now(),
      });
    }

    outcome.invited += 1;
    free -= 1;
  }

  await syncMatchStatus(ctx, match._id);

  return outcome;
}

/** Invita giocatori a una partita già creata. Solo chi l'ha creata. */
export default mutation({
  args: {
    matchId: v.id("openMatches"),
    playerIds: v.array(v.id("players")),
  },
  handler: async (ctx, { matchId, playerIds }) => {
    const player = await requirePlayer(ctx);

    const match = await ctx.db.get(matchId);
    if (!match) {
      throw new Error("Partita non trovata.");
    }

    if (match.creatorId !== player._id) {
      throw new Error("Solo chi ha creato la partita può invitare giocatori.");
    }

    if (match.status === "cancelled") {
      throw new Error("La partita è stata annullata.");
    }

    if (match.matchDate <= Date.now()) {
      throw new Error("La partita è già iniziata o conclusa.");
    }

    if (playerIds.length === 0) {
      throw new Error("Scegli almeno un giocatore da invitare.");
    }

    return await inviteToMatch(ctx, match, playerIds);
  },
});
