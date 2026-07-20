import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getIdentityPlayer, LEVEL_MAX, LEVEL_MIN, toPlayerView } from "./lib";

/**
 * Profilo giocatore dell'utente autenticato.
 * Restituisce null se non autenticato o se il profilo non è ancora stato creato
 * (l'app mostra l'onboarding in quel caso).
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const player = await getIdentityPlayer(ctx);
    return player ? toPlayerView(player) : null;
  },
});

/** Crea o aggiorna il profilo giocatore dell'utente autenticato. */
export const upsertProfile = mutation({
  args: {
    name: v.string(),
    level: v.number(),
  },
  handler: async (ctx, { name, level }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Devi effettuare l'accesso.");
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Inserisci il tuo nome.");
    }

    if (level < LEVEL_MIN || level > LEVEL_MAX) {
      throw new Error("Il livello deve essere compreso tra 1.0 e 5.0.");
    }

    const avatarUrl =
      typeof identity.pictureUrl === "string" ? identity.pictureUrl : undefined;

    const existing = await ctx.db
      .query("players")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: trimmedName,
        level,
        avatarUrl: avatarUrl ?? existing.avatarUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("players", {
      clerkUserId: identity.subject,
      name: trimmedName,
      level,
      avatarUrl,
      createdAt: Date.now(),
    });
  },
});
