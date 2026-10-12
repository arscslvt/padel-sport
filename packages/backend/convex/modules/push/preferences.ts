import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import { notificationCategory } from "../../utils/notificationCategories";
import { assertServer } from "../../utils/serverSecret";

/**
 * Quali tipi di avviso un membro dello staff ha spento.
 *
 * Le chiama la route della dashboard (app/api/dashboard/push/preferences)
 * con l'`userId` della sessione Clerk già verificata: ognuno legge e cambia
 * solo le sue.
 */

export const get = query({
  args: { secret: v.string(), userId: v.string() },
  handler: async (ctx, { secret, userId }) => {
    assertServer(secret);

    const row = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return { muted: row?.muted ?? [] };
  },
});

export const set = mutation({
  args: {
    secret: v.string(),
    userId: v.string(),
    muted: v.array(notificationCategory),
  },
  handler: async (ctx, { secret, userId, muted }) => {
    assertServer(secret);

    const unique = [...new Set(muted)];
    const row = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (row) {
      await ctx.db.patch(row._id, { muted: unique, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("notificationPreferences", {
        userId,
        muted: unique,
        updatedAt: Date.now(),
      });
    }

    return { muted: unique };
  },
});
