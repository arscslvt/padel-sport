import { v } from "convex/values";

import { internal } from "../../_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../../_generated/server";
import { notificationCategory } from "../../utils/notificationCategories";
import { assertServer } from "../../utils/serverSecret";

/**
 * I dispositivi dello staff che ricevono le notifiche push.
 *
 * Le funzioni pubbliche portano il segreto condiviso: le chiama la route della
 * dashboard (app/api/dashboard/push), che ha già verificato su Clerk che chi
 * chiede è dello staff. Le altre servono all'invio (modules/push/send.ts).
 */

/**
 * Invii falliti di fila oltre i quali un dispositivo si toglie.
 *
 * Il 404 e il 410 tolgono la riga subito; questa soglia copre il resto — una
 * chiave VAPID cambiata, un servizio che risponde 403 per sempre. Cinque è
 * abbastanza per non perdere un telefono a un disservizio di Apple di un'ora.
 */
const MAX_FAILURES = 5;

export const subscribe = mutation({
  args: {
    secret: v.string(),
    userId: v.string(),
    userName: v.optional(v.string()),
    device: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, { secret, ...args }) => {
    assertServer(secret);

    if (!args.endpoint.startsWith("https://")) {
      throw new Error("Indirizzo del servizio push non valido.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (existing) {
      // Lo stesso telefono che si ripresenta: si aggiornano chiavi e padrone
      // (può aver fatto l'accesso qualcun altro) e si azzera il conto degli
      // errori, perché chi ripresenta l'abbonamento lo ha appena rinnovato.
      await ctx.db.patch(existing._id, {
        ...args,
        lastSeenAt: now,
        failures: 0,
        lastError: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("pushSubscriptions", {
      ...args,
      createdAt: now,
      lastSeenAt: now,
      failures: 0,
    });
  },
});

/** Toglie un dispositivo: il proprio (per `endpoint`) o quello di un collega (per `id`). */
export const remove = mutation({
  args: {
    secret: v.string(),
    endpoint: v.optional(v.string()),
    id: v.optional(v.id("pushSubscriptions")),
  },
  handler: async (ctx, { secret, endpoint, id }) => {
    assertServer(secret);

    const row = id
      ? await ctx.db.get(id)
      : endpoint
        ? await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
            .unique()
        : null;

    if (row) await ctx.db.delete(row._id);
    return Boolean(row);
  },
});

/**
 * I dispositivi attivi e la chiave pubblica con cui abbonarne di nuovi.
 *
 * La chiave pubblica sta qui e non in una variabile della dashboard: la
 * privata vive su questo deployment, e due copie della pubblica in due posti
 * diversi sono il modo più semplice per farle divergere.
 */
export const list = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertServer(secret);

    const rows = await ctx.db.query("pushSubscriptions").collect();

    return {
      publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
      devices: rows
        .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
        .map((row) => ({
          _id: row._id,
          endpoint: row.endpoint,
          userId: row.userId,
          userName: row.userName,
          device: row.device,
          createdAt: row.createdAt,
          lastSeenAt: row.lastSeenAt,
          lastSuccessAt: row.lastSuccessAt,
          lastError: row.lastError,
        })),
    };
  },
});

/** Una notifica di prova al solo dispositivo che l'ha chiesta. */
export const test = mutation({
  args: { secret: v.string(), endpoint: v.string() },
  handler: async (ctx, { secret, endpoint }) => {
    assertServer(secret);

    const row = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (!row) throw new Error("Questo dispositivo non è ancora attivo.");

    await ctx.scheduler.runAfter(0, internal.modules.push.send.default, {
      title: "Notifiche attive",
      body: "Da qui in poi le nuove prenotazioni arrivano anche su questo dispositivo.",
      endpoints: [endpoint],
    });
  },
});

/**
 * A chi mandare: tutti i dispositivi, meno quelli di chi ha spento il tipo
 * di avviso (tables/notificationPreferences.ts).
 */
export const targets = internalQuery({
  args: {
    endpoints: v.optional(v.array(v.string())),
    category: v.optional(notificationCategory),
  },
  handler: async (ctx, { endpoints, category }) => {
    const rows = await ctx.db.query("pushSubscriptions").collect();
    const wanted = endpoints ? new Set(endpoints) : null;

    const muted = new Set<string>();
    if (category) {
      const preferences = await ctx.db.query("notificationPreferences").collect();
      for (const preference of preferences) {
        if (preference.muted.includes(category)) muted.add(preference.userId);
      }
    }

    return rows
      .filter((row) => !wanted || wanted.has(row.endpoint))
      .filter((row) => !muted.has(row.userId))
      .map((row) => ({
        _id: row._id,
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
      }));
  },
});

/**
 * Il numero sull'icona dell'app: le prenotazioni che aspettano una risposta.
 *
 * È lo stesso conto del badge «Agenda» sulla barra (api/dashboard/counts):
 * l'icona e la barra non devono dire due cose diverse.
 */
export const badgeCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pending = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", "pending_on_site_payment"))
      .collect();

    return pending.filter((booking) => booking.bookingDate >= now).length;
  },
});

/** Com'è andato un giro di invii: chi è sparito si toglie, chi risponde si rinfresca. */
export const report = internalMutation({
  args: {
    results: v.array(
      v.object({
        id: v.id("pushSubscriptions"),
        ok: v.boolean(),
        gone: v.optional(v.boolean()),
        error: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { results }) => {
    const now = Date.now();

    for (const result of results) {
      const row = await ctx.db.get(result.id);
      if (!row) continue;

      if (result.ok) {
        await ctx.db.patch(row._id, {
          lastSuccessAt: now,
          lastError: undefined,
          failures: 0,
        });
        continue;
      }

      if (result.gone || row.failures + 1 >= MAX_FAILURES) {
        await ctx.db.delete(row._id);
        continue;
      }

      await ctx.db.patch(row._id, {
        failures: row.failures + 1,
        lastError: result.error,
      });
    }
  },
});
