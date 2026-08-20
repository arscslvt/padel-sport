import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { requirePlayer } from "../openMatches/lib";
import { inviteToCircle } from "./invite";
import { assertCircleQuota } from "./lib";

const NAME_MAX = 40;

/**
 * Crea una cerchia e, se sono stati indicati, spedisce subito gli inviti.
 *
 * Il proprietario diventa il primo membro con una riga `circleMembers` come
 * tutti gli altri, così il conteggio delle cerchie a testa non deve trattarlo
 * come un caso a parte.
 */
export default mutation({
  args: {
    name: v.string(),
    playerIds: v.optional(v.array(v.id("players"))),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { name, playerIds, note }) => {
    const player = await requirePlayer(ctx);

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new Error("Dai un nome alla cerchia (almeno due caratteri).");
    }

    if (trimmed.length > NAME_MAX) {
      throw new Error(`Il nome della cerchia non può superare i ${NAME_MAX} caratteri.`);
    }

    await assertCircleQuota(ctx, player._id);

    const circleId = await ctx.db.insert("circles", {
      name: trimmed,
      ownerId: player._id,
      createdAt: Date.now(),
    });

    await ctx.db.insert("circleMembers", {
      circleId,
      playerId: player._id,
      role: "owner",
      joinedAt: Date.now(),
    });

    let invited = 0;
    if (playerIds && playerIds.length > 0) {
      const circle = await ctx.db.get(circleId);
      if (!circle) {
        throw new Error("Si è verificato un errore. Riprova.");
      }

      const outcome = await inviteToCircle(
        ctx,
        circle,
        player,
        playerIds,
        note?.trim() || undefined,
      );
      invited = outcome.invited;
    }

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      {
        title: "Nuova cerchia",
        message: `${player.name} ha creato la cerchia "${trimmed}"${
          invited > 0 ? ` e ha invitato ${invited} giocatori.` : "."
        }`,
        // Senza `url`: le cerchie vivono solo nell'app, non c'è una pagina
        // della dashboard su cui far atterrare il tocco.
        idempotencyKey: `circle-new-${circleId}`,
      },
    );

    return { circleId, invited };
  },
});
