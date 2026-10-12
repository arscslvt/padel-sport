/**
 * Le notifiche push del gestionale, dal lato del browser.
 *
 * Il quadro, piattaforma per piattaforma:
 *
 * - Android, Chrome, Edge, Firefox e Safari su Mac: funzionano dal browser,
 *   installare il gestionale è facoltativo;
 * - iPhone e iPad (iOS 16.4+): solo dal gestionale aggiunto alla schermata
 *   Home. Nella scheda di Safari `PushManager` non esiste nemmeno, e l'unica
 *   cosa utile da fare è spiegare come installarlo.
 *
 * In tutti i casi il consenso si chiede solo dopo un tocco esplicito
 * dell'utente (Safari lo pretende, Chrome declassa a richiesta silenziosa chi
 * lo chiede all'apertura), e solo dopo che il gestionale ha spiegato perché.
 */

/** Evento che il gestionale lancia quando arriva una push: chi mostra dati si ricarica. */
export const PUSH_REFRESH_EVENT = "dashboard:push";

export type PushSupport = "supported" | "needs-install" | "unsupported";

/** iPadOS si presenta come un Mac: lo tradisce lo schermo touch. */
export function isAppleMobile() {
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

export function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupport(): PushSupport {
  const capable =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  if (capable) return "supported";
  if (isAppleMobile() && !isInstalled()) return "needs-install";
  return "unsupported";
}

/** «iPhone · app», «Android · Chrome»: per riconoscere i dispositivi nell'elenco. */
export function deviceLabel() {
  const ua = navigator.userAgent;
  const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;

  const platform = /iPhone|iPod/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || touchMac
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : "Computer";

  const browser = /EdgA?\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /Firefox|FxiOS/.test(ua)
        ? "Firefox"
        : /Chrome|CriOS/.test(ua)
          ? "Chrome"
          : /Safari/.test(ua)
            ? "Safari"
            : "browser";

  return `${platform} · ${isInstalled() ? "app" : browser}`;
}

export function registerServiceWorker() {
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    // Il file del service worker si ricontrolla sempre in rete: è il solo
    // modo perché una versione nuova arrivi sui telefoni già abbonati.
    updateViaCache: "none",
  });
}

function base64UrlToBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/**
 * L'abbonamento è stato fatto con questa chiave VAPID? Se la chiave sul server
 * è cambiata, quello vecchio non riceve più niente — il servizio push rifiuta
 * i messaggi firmati con l'altra — e va rifatto.
 */
export function matchesKey(subscription: PushSubscription, publicKey: string) {
  const current = subscription.options.applicationServerKey;
  if (!current) return true;

  const expected = base64UrlToBytes(publicKey);
  const actual = new Uint8Array(current);
  return (
    actual.length === expected.length &&
    actual.every((byte, index) => byte === expected[index])
  );
}

export function subscribe(
  registration: ServiceWorkerRegistration,
  publicKey: string,
) {
  return registration.pushManager.subscribe({
    // Obbligatorio ovunque, e Safari non accetta altro: ogni push mostra una
    // notifica. Il service worker lo rispetta sempre (public/sw.js).
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(publicKey),
  });
}

async function call<T>(
  path: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? "Riprova fra poco.");
  }
  return payload as T;
}

export const pushApi = {
  load: () =>
    call<{
      publicKey: string | null;
      muted: string[];
      devices: PushDevice[];
    }>("/api/dashboard/push", "GET"),
  save: (subscription: PushSubscription) =>
    call("/api/dashboard/push", "POST", {
      subscription: subscription.toJSON(),
      device: deviceLabel(),
    }),
  remove: (target: { endpoint: string } | { id: string }) =>
    call("/api/dashboard/push", "DELETE", target),
  test: (endpoint: string) =>
    call("/api/dashboard/push/test", "POST", { endpoint }),
  setMuted: (muted: string[]) =>
    call<{ muted: string[] }>("/api/dashboard/push/preferences", "PUT", {
      muted,
    }),
};

export interface PushDevice {
  _id: string;
  endpoint: string;
  userId: string;
  userName?: string;
  device: string;
  createdAt: number;
  lastSeenAt: number;
  lastSuccessAt?: number;
  lastError?: string;
}
