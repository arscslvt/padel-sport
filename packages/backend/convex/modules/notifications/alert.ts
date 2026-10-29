import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../functions";
import { notificationCategory } from "../../utils/notificationCategories";

/**
 * L'avviso allo staff, da qualunque punto del backend.
 *
 * Passa da un'azione perché le mutation non possono uscire in rete: chi scrive
 * a database la schedula con `runAfter(0, …)` e va avanti. Gli indirizzi da
 * mettere in `url` si compongono con `utils/staffLinks`.
 *
 * Arriva come notifica push del gestionale (modules/push/send.ts) su ogni
 * telefono dello staff del club che le ha attivate. Non solleva mai: un
 * avviso perso non deve far fallire chi l'ha chiesto.
 *
 * `category` dice di che avviso si tratta (utils/notificationCategories.ts):
 * le push arrivano solo a chi non ha spento quel tipo.
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
  async handler(
    ctx,
    { category, title, message, url, idempotencyKey, clubId },
  ): Promise<void> {
    await ctx
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
      });
  },
});
