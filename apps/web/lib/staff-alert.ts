import "server-only";

import { api } from "@padel-sport/backend/convex/_generated/api";
import type { NotificationCategory } from "@padel-sport/backend/convex/utils/notificationCategories";
import { ConvexHttpClient } from "convex/browser";

export interface StaffNotification {
  /** Il titolo della notifica. Deve bastare da solo a dire cos'è successo. */
  title: string;
  /** Il corpo del messaggio. */
  body: string;
  /** Dove porta il tocco sulla notifica. Senza, la notifica non è cliccabile. */
  url?: string;
  /**
   * Chiave stabile dell'evento: una notifica con la stessa chiave prende il
   * posto della precedente sul telefono invece di aggiungersi.
   */
  idempotencyKey?: string;
}

/**
 * L'avviso allo staff dalle route del sito.
 *
 * Passa da Convex (modules/notifications/staff.ts), che lo manda come
 * notifica push del gestionale: un avviso, una strada sola, da qualunque
 * parte nasca.
 *
 * Non solleva mai: quando parte, la richiesta è già salvata. Se Convex non
 * risponde l'avviso si perde, e lo dice il log; la richiesta resta comunque
 * nel gestionale. `category` decide chi la riceve: chi ha spento quel tipo no.
 */
export async function notifyStaff({
  category,
  ...notification
}: StaffNotification & { category: NotificationCategory }): Promise<boolean> {
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

  return false;
}
