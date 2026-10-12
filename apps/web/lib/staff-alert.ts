import "server-only";

import { api } from "@padel-sport/backend/convex/_generated/api";
import {
  type HarkNotification,
  sendHark,
} from "@padel-sport/backend/convex/utils/hark";
import type { NotificationCategory } from "@padel-sport/backend/convex/utils/notificationCategories";
import { ConvexHttpClient } from "convex/browser";

/**
 * L'avviso allo staff dalle route del sito.
 *
 * Passa da Convex (modules/notifications/staff.ts), che lo manda insieme alle
 * notifiche push del gestionale e a Hark: un avviso, una strada sola, da
 * qualunque parte nasca. Se Convex non risponde si ripiega su Hark diretto —
 * meglio un canale che nessuno, ed è il comportamento di prima.
 *
 * Come `sendHark`, non solleva mai: quando parte, la richiesta è già salvata.
 * `category` decide chi la riceve come push: chi ha spento quel tipo no.
 */
export async function notifyStaff({
  category,
  ...notification
}: HarkNotification & { category: NotificationCategory }): Promise<boolean> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.BOOKING_WEBHOOK_SECRET;

  if (convexUrl && secret) {
    try {
      await new ConvexHttpClient(convexUrl).mutation(
        api.modules.notifications.staff.default,
        {
          secret,
          category,
          title: notification.title,
          message: notification.body,
          url: notification.url,
          idempotencyKey: notification.idempotencyKey,
        },
      );
      return true;
    } catch (error) {
      console.error("Avviso allo staff non passato da Convex:", error);
    }
  }

  return sendHark(notification);
}
