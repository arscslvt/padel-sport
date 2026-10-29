"use node";

import { createHash } from "node:crypto";
import { v } from "convex/values";
import webpush, { WebPushError } from "web-push";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../functions";
import { notificationCategory } from "../../utils/notificationCategories";
import { staffBookingsUrl } from "../../utils/staffLinks";

/**
 * Le notifiche push ai dispositivi dello staff, col Push API standard.
 *
 * Nessun intermediario: il messaggio va cifrato (RFC 8291) e firmato con la
 * chiave VAPID (RFC 8292) direttamente al servizio push del telefono — Apple
 * per iPhone e Safari, Google per Chrome e Android, Mozilla per Firefox. Su
 * iPhone arrivano solo al gestionale aggiunto alla schermata Home (iOS 16.4+).
 *
 * Il corpo è nel formato del Declarative Web Push di Safari (`web_push: 8030`):
 * da iOS 18.4 il telefono mostra la notifica anche se il service worker non
 * fa in tempo a svegliarsi, che su iPhone è la ragione più comune di avvisi
 * persi. Gli altri browser ricevono lo stesso JSON e lo legge il nostro
 * service worker (apps/dashboard/public/sw.js): un formato solo per tutti.
 *
 * Come Hark, non solleva mai: quando parte, il fatto è già a database.
 */

/**
 * Quanto il servizio push tiene il messaggio se il telefono è spento. Dodici
 * ore coprono una notte: una prenotazione di ieri sera serve ancora stamattina,
 * una di tre giorni fa no — a quel punto la si vede aprendo l'agenda.
 */
const TTL_SECONDS = 12 * 60 * 60;

/** Un servizio push lento non deve tenere ferma l'azione che avvisa. */
const TIMEOUT_MS = 10_000;

/**
 * Il `Topic` dell'RFC 8030: un messaggio ancora in coda con lo stesso topic
 * viene sostituito invece di accodarsene un altro. Dalla chiave di idempotenza
 * dell'avviso, così un'azione ritentata non fa suonare due volte. Il formato
 * vuole al più 32 caratteri dell'alfabeto base64url.
 */
function topicOf(key: string) {
  return createHash("sha256").update(key).digest("base64url").slice(0, 32);
}

function describe(error: unknown) {
  if (error instanceof WebPushError) {
    return `${error.statusCode}${error.body ? `: ${error.body.slice(0, 200)}` : ""}`;
  }
  return error instanceof Error ? error.message : String(error);
}

type SendResult = {
  id: Id<"pushSubscriptions">;
  ok: boolean;
  gone?: boolean;
  error?: string;
};

export default internalAction({
  args: {
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    /**
     * Identifica l'evento sul telefono: una notifica con lo stesso tag prende
     * il posto della precedente invece di aggiungersi.
     */
    tag: v.optional(v.string()),
    /**
     * Il tipo di avviso: lo ricevono solo i dispositivi di chi non l'ha
     * spento. Senza (la prova dalle impostazioni) passa a tutti.
     */
    category: v.optional(notificationCategory),
    /** Solo questi dispositivi (la prova dalle impostazioni); senza, tutti. */
    endpoints: v.optional(v.array(v.string())),
    /**
     * Secondi oltre i quali il messaggio non va più consegnato. Senza, le
     * dodici ore di `TTL_SECONDS`; un promemoria «fra 10 minuti» arrivato
     * dopo la partita è peggio di nessun promemoria (modules/reminders).
     */
    ttl: v.optional(v.number()),
    /**
     * Il club dell'avviso: arriva solo al suo staff. Obbligatorio apposta,
     * perché gli avvisi hanno nomi e orari dei clienti.
     */
    clubId: v.id("clubs"),
  },
  // Il tipo di ritorno va scritto: dedotto, Convex lo farebbe dipendere da
  // `internal`, che dipende da questo file.
  handler: async (
    ctx,
    { title, body, url, tag, category, endpoints, ttl, clubId },
  ): Promise<{ sent: number }> => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:supporto@asdpadelsport.com";

    if (!publicKey || !privateKey) {
      console.warn(
        "VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY non configurate: nessuna notifica push inviata.",
      );
      return { sent: 0 };
    }

    const targets = await ctx.runQuery(
      internal.modules.push.subscriptions.targets,
      { endpoints, category, clubId },
    );
    if (targets.length === 0) return { sent: 0 };

    const badge = await ctx.runQuery(
      internal.modules.push.subscriptions.badgeCount,
      { clubId },
    );

    const payload = JSON.stringify({
      web_push: 8030,
      notification: {
        title,
        body,
        // Obbligatorio nel formato dichiarativo: senza un indirizzo Safari
        // scarta il messaggio. La home del gestionale fa da ripiego.
        navigate: url ?? staffBookingsUrl(),
        lang: "it",
        dir: "ltr",
        silent: false,
        ...(tag ? { tag } : {}),
        app_badge: String(badge),
      },
    });

    const results: SendResult[] = await Promise.all(
      targets.map(async (target): Promise<SendResult> => {
        try {
          await webpush.sendNotification(
            {
              endpoint: target.endpoint,
              keys: { p256dh: target.p256dh, auth: target.auth },
            },
            payload,
            {
              vapidDetails: { subject, publicKey, privateKey },
              TTL: ttl ?? TTL_SECONDS,
              // Una prenotazione nuova è una notizia da dare subito: senza,
              // Android in risparmio energetico la consegna quando gli pare.
              urgency: "high",
              timeout: TIMEOUT_MS,
              ...(tag ? { topic: topicOf(tag) } : {}),
            },
          );
          return { id: target._id, ok: true };
        } catch (error) {
          // 404 e 410: l'abbonamento non esiste più. Il resto è un guasto
          // da registrare, che dopo qualche ripetizione toglie la riga.
          const gone =
            error instanceof WebPushError &&
            (error.statusCode === 404 || error.statusCode === 410);

          if (!gone) {
            console.error(
              `Notifica push non consegnata a ${new URL(target.endpoint).host}:`,
              describe(error),
            );
          }

          return { id: target._id, ok: false, gone, error: describe(error) };
        }
      }),
    );

    await ctx.runMutation(internal.modules.push.subscriptions.report, {
      results,
    });

    return { sent: results.filter((result) => result.ok).length };
  },
});
