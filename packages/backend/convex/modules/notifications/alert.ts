import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../functions";
import { sendHark } from "../../utils/hark";
import { notificationCategory } from "../../utils/notificationCategories";

/**
 * L'avviso allo staff, da qualunque punto del backend.
 *
 * Passa da un'azione perché le mutation non possono uscire in rete: chi scrive
 * a database la schedula con `runAfter(0, …)` e va avanti. Gli indirizzi da
 * mettere in `url` si compongono con `utils/staffLinks`.
 *
 * Parte su due canali insieme, e nessuno dei due aspetta l'altro: le notifiche
 * push del gestionale (modules/push/send.ts), che arrivano su ogni telefono
 * dello staff che le ha attivate, e Hark finché `HARK_WEBHOOK_URL` è
 * configurata. Un canale giù non ferma l'altro.
 *
 * `category` dice di che avviso si tratta (utils/notificationCategories.ts):
 * le push arrivano solo a chi non ha spento quel tipo, Hark riceve tutto.
 */
export default internalAction({
  args: {
    category: notificationCategory,
    title: v.string(),
    message: v.string(),
    url: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    /** Il club dell'avviso: le push arrivano solo al suo staff (push/send.ts). */
    clubId: v.id("clubs"),
  },
  async handler(ctx, { category, title, message, url, idempotencyKey, clubId }) {
    await Promise.all([
      sendHark({ title, body: message, url, idempotencyKey }),
      ctx
        .runAction(internal.modules.push.send.default, {
          clubId,
          category,
          title,
          body: message,
          url,
          tag: idempotencyKey,
        })
        .catch((error) => {
          console.error("Notifiche push allo staff non inviate:", error);
        }),
    ]);
  },
});
