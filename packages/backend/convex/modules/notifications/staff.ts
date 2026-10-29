import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { serverMutation } from "../../functions";
import { notificationCategory } from "../../utils/notificationCategories";

/**
 * L'avviso allo staff chiesto dal sito: richieste di assistenza, richieste di
 * giocatori, iscrizioni agli eventi.
 *
 * Passando da qui l'avviso prende la stessa strada di quelli nati nel backend
 * (`alert.ts`) e arriva ai telefoni con le notifiche push attive. Porta il
 * segreto condiviso: senza,
 * chiunque conosca l'URL del deployment potrebbe far suonare il telefono
 * dello staff.
 */
export default serverMutation({
  args: {
    category: notificationCategory,
    title: v.string(),
    message: v.string(),
    url: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, { ...notification }) => {
    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      { ...notification, clubId: ctx.club._id },
    );
  },
});
