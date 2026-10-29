import { defineTable } from "convex/server";
import { v } from "convex/values";

import { notificationCategory } from "../utils/notificationCategories";

/**
 * Quali avvisi un membro dello staff non vuole sul telefono.
 *
 * Sono di chi le sceglie, non del dispositivo: chi spegne le disdette dal
 * telefono non se le ritrova sul computer. Si salvano i tipi spenti, così un
 * tipo nuovo (utils/notificationCategories.ts) arriva acceso a tutti senza
 * dover toccare le righe che ci sono già. Nessuna riga, tutto acceso.
 */
const notificationPreferences = defineTable({
  /** Il club della riga (docs/multi-club.md). */
  clubId: v.id("clubs"),
  /** `userId` Clerk */
  userId: v.string(),
  muted: v.array(notificationCategory),
  updatedAt: v.float64(),
})
  .index("by_user", ["userId"])
  .index("by_club_user", ["clubId", "userId"]);

export default notificationPreferences;
