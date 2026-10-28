import { v } from "convex/values";

import { serverMutation, serverQuery } from "../../functions";
import { notificationCategory } from "../../utils/notificationCategories";

/**
 * Quali tipi di avviso un membro dello staff ha spento.
 *
 * Le chiama la route della dashboard (app/api/dashboard/push/preferences)
 * con l'`userId` della sessione Clerk già verificata: ognuno legge e cambia
 * solo le sue.
 */

export const get = serverQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return { muted: row?.muted ?? [] };
  },
});

export const set = serverMutation({
  args: {
    userId: v.string(),
    muted: v.array(notificationCategory),
  },
  handler: async (ctx, { userId, muted }) => {
    const unique = [...new Set(muted)];
    const row = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (row) {
      await ctx.db.patch(row._id, { muted: unique, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("notificationPreferences", {
        clubId: ctx.club._id,
        userId,
        muted: unique,
        updatedAt: Date.now(),
      });
    }

    return { muted: unique };
  },
});
