/**
 * Il service worker del gestionale: solo notifiche push, nessuna cache.
 *
 * Il messaggio arriva nel formato del Declarative Web Push di Safari
 * (`{ web_push: 8030, notification: { title, body, navigate, … } }`, vedi
 * packages/backend/convex/modules/push/send.ts). Da iOS 18.4 Safari lo mostra
 * anche da solo; qui lo si legge per tutti gli altri browser, e su Safari la
 * notifica mostrata da qui prende il posto di quella proposta.
 *
 * Niente cache offline di proposito: il gestionale lavora su dati che cambiano
 * di minuto in minuto, e una pagina vecchia servita senza rete farebbe più
 * danni di un errore di connessione.
 */

const FALLBACK_URL = "/";

/**
 * Il titolo di riserva, per un messaggio arrivato senza: copia di `APP_NAME`
 * (lib/app.ts), perché un file statico non può importarla.
 */
const APP_NAME = "Padel Sport Manager";

self.addEventListener("install", () => {
  // Una versione nuova non aspetta che si chiudano tutte le schede.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function readPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    return {
      notification: { title: APP_NAME, body: event.data.text() },
    };
  }
}

async function updateBadge(value) {
  if (value === undefined || !("setAppBadge" in self.navigator)) return;
  const count = Number(value);
  try {
    if (count > 0) await self.navigator.setAppBadge(count);
    else await self.navigator.clearAppBadge();
  } catch {
    // Il numero sull'icona è un di più: se il sistema non lo vuole, pazienza.
  }
}

self.addEventListener("push", (event) => {
  const payload = readPayload(event);
  const notification = payload.notification ?? payload;
  const url = notification.navigate ?? notification.url ?? FALLBACK_URL;

  event.waitUntil(
    (async () => {
      // Su iPhone una push che non mostra niente costa cara: dopo qualche
      // volta Safari revoca l'abbonamento. La notifica parte sempre per prima.
      await self.registration.showNotification(
        notification.title || APP_NAME,
        {
          body: notification.body,
          tag: notification.tag,
          // Con lo stesso tag la notifica sostituisce la precedente: deve
          // comunque suonare, perché è un evento nuovo o un aggiornamento.
          renotify: Boolean(notification.tag),
          lang: notification.lang ?? "it",
          dir: notification.dir ?? "ltr",
          silent: notification.silent === true,
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-96.png",
          data: { url },
        },
      );

      await updateBadge(notification.app_badge);

      // Le schede aperte si riallineano subito invece di aspettare il giro
      // del minuto (counts.provider, use-agenda).
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) client.postMessage({ type: "push" });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(
    event.notification.data?.url ?? FALLBACK_URL,
    self.location.origin,
  );

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Il gestionale è già aperto: si riporta davanti e si sposta lì, invece
      // di aprirne un'altra copia a ogni tocco.
      const open = windows.find(
        (client) => new URL(client.url).origin === target.origin,
      );

      if (open) {
        await open.focus();
        if (open.url !== target.href) {
          try {
            await open.navigate(target.href);
          } catch {
            await self.clients.openWindow(target.href);
          }
        }
        return;
      }

      await self.clients.openWindow(target.href);
    })(),
  );
});

/**
 * Chrome e Firefox rinnovano l'abbonamento da soli quando scade, e lo dicono
 * qui: il nuovo va comunicato al server, o le notifiche smettono di arrivare
 * senza che nessuno se ne accorga. Safari non lo fa — per quello il gestionale
 * ripresenta l'abbonamento a ogni apertura (app/_components/push-sync.tsx).
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const options = event.oldSubscription?.options;
      const subscription =
        event.newSubscription ??
        (options ? await self.registration.pushManager.subscribe(options) : null);
      if (!subscription) return;

      await fetch("/api/dashboard/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          replaces: event.oldSubscription?.endpoint,
        }),
      });
    })(),
  );
});
