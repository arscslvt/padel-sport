"use client";

import type { NotificationCategory } from "@padel-sport/backend/convex/utils/notificationCategories";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { PushPrompt } from "@/app/_components/notifications/push-prompt";
import {
  isAppleMobile,
  matchesKey,
  PUSH_REFRESH_EVENT,
  type PushDevice,
  type PushSupport,
  pushApi,
  pushSupport,
  registerServiceWorker,
  subscribe,
} from "@/lib/push";

import { useCounts } from "./counts.provider";
import { useDashboardTour } from "./tour.provider";

/**
 * Le notifiche push di questo dispositivo, e la richiesta di attivarle.
 *
 * Tiene in un posto solo quel che servono sia alla richiesta (che compare da
 * sola) sia alla sezione in Configurazione: se il browser le supporta, se il
 * permesso c'è, se questo dispositivo è abbonato, quali tipi di avviso sono
 * spenti. Fa anche il lavoro di fondo:
 *
 * - registra il service worker a ogni apertura e ripresenta l'abbonamento al
 *   server — Safari non dice quando cambia, ed è così che il server lo sa;
 * - quando arriva una push con il gestionale aperto, ricarica contatori e
 *   agenda invece di aspettare il giro del minuto;
 * - tiene il numero sull'icona dell'app uguale a quello sulla barra.
 *
 * La richiesta segue le regole che i browser premiano: mai all'apertura e mai
 * sopra il tour, prima una spiegazione nostra e solo dopo un «sì» il permesso
 * del browser, che non si può più chiedere una seconda volta se lo si nega.
 */

/** Il tempo di vedere la pagina prima che compaia la richiesta. */
const PROMPT_DELAY = 1500;

/** Chi ha detto «non ora» non se la ritrova prima di una settimana. */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const SNOOZE_KEY = "dashboard-push-prompt";

function snoozed() {
  try {
    const at = Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0);
    return Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {
    // Senza memoria del browser la richiesta tornerà alla prossima apertura.
  }
}

/** Dove si riaccendono le notifiche negate: dipende da chi le ha negate. */
export function deniedHelp() {
  return isAppleMobile()
    ? "Riattivale da Impostazioni › Notifiche › Gestionale."
    : "Riattivale dalle impostazioni del sito nel browser, dall'icona accanto all'indirizzo.";
}

interface PushContextValue {
  /** `null` finché il browser non è stato interrogato (primo render). */
  support: PushSupport | null;
  permission: NotificationPermission | null;
  /** L'abbonamento di questo dispositivo, se c'è e il server lo conosce. */
  endpoint: string | null;
  /** Il server ha la chiave VAPID: senza, non si può abbonare nessuno. */
  configured: boolean;
  /** Le risposte del server sono arrivate. */
  loaded: boolean;
  devices: PushDevice[];
  muted: NotificationCategory[];
  working: boolean;
  enable: (muted?: NotificationCategory[]) => Promise<boolean>;
  disable: () => Promise<void>;
  sendTest: () => Promise<void>;
  setMuted: (muted: NotificationCategory[]) => Promise<void>;
  removeDevice: (device: PushDevice) => Promise<void>;
  openPrompt: () => void;
}

const PushContext = createContext<PushContextValue | null>(null);

export function usePush() {
  const context = useContext(PushContext);
  if (!context) throw new Error("usePush va usato dentro PushProvider");
  return context;
}

const NONE: NotificationCategory[] = [];

type ServerState = {
  publicKey: string | null;
  devices: PushDevice[];
  muted: NotificationCategory[];
};

export default function PushProvider({ children }: { children: ReactNode }) {
  const { counts, refresh } = useCounts();
  const { busy: tourBusy } = useDashboardTour();

  const [support, setSupport] = useState<PushSupport | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  /** L'abbonamento di questo dispositivo è stato controllato. */
  const [checked, setChecked] = useState(false);
  const [server, setServer] = useState<ServerState | null>(null);
  const [working, setWorking] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  const reload = useCallback(async () => {
    const data = await pushApi.load();
    const next: ServerState = {
      publicKey: data.publicKey,
      devices: data.devices,
      muted: data.muted as NotificationCategory[],
    };
    setServer(next);
    return next;
  }, []);

  // All'apertura: cosa sa fare il browser, il service worker, l'abbonamento.
  useEffect(() => {
    const detected = pushSupport();
    setSupport(detected);

    let cancelled = false;

    (async () => {
      let data: ServerState | null = null;
      try {
        data = await reload();
      } catch (error) {
        console.error("Stato delle notifiche non caricato:", error);
      }

      if (detected !== "supported") {
        if (!cancelled) setChecked(true);
        return;
      }

      setPermission(Notification.permission);

      try {
        const current = await registerServiceWorker();
        if (cancelled) return;
        setRegistration(current);

        const subscription = await current.pushManager.getSubscription();
        if (!subscription || Notification.permission !== "granted") return;

        // Chiave cambiata sul server: questo abbonamento non riceve più
        // niente. Si toglie, e la richiesta ricomparirà per rifarlo.
        if (data?.publicKey && !matchesKey(subscription, data.publicKey)) {
          await subscription.unsubscribe();
          return;
        }

        await pushApi.save(subscription);
        if (!cancelled) setEndpoint(subscription.endpoint);
      } catch (error) {
        console.error("Abbonamento alle notifiche non verificato:", error);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reload]);

  // Una push con il gestionale aperto: i dati si riallineano subito.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "push") return;
      refresh();
      window.dispatchEvent(new Event(PUSH_REFRESH_EVENT));
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [refresh]);

  // Il numero sull'icona dell'app: le prenotazioni da confermare.
  const pending = counts?.agenda;
  useEffect(() => {
    if (pending === undefined || !("setAppBadge" in navigator)) return;
    const update =
      pending > 0 ? navigator.setAppBadge(pending) : navigator.clearAppBadge();
    update.catch(() => {
      // Non tutti i sistemi lo permettono, e non è niente di grave.
    });
  }, [pending]);

  // La richiesta: solo a chi può dire di sì e non ha già risposto.
  useEffect(() => {
    if (promptOpen || tourBusy || !checked || !server || endpoint) return;
    if (support === null || support === "unsupported") return;
    // Senza la chiave VAPID sul server non si abbona nessuno: chiedere (o
    // far installare l'app per poi non poterle accendere) sarebbe una presa
    // in giro.
    if (!server.publicKey) return;
    if (support === "supported" && permission === "denied") return;
    if (snoozed()) return;

    const timer = window.setTimeout(() => setPromptOpen(true), PROMPT_DELAY);
    return () => window.clearTimeout(timer);
  }, [promptOpen, tourBusy, checked, server, endpoint, support, permission]);

  const setMuted = useCallback(
    async (muted: NotificationCategory[]) => {
      const previous = server?.muted ?? [];
      setServer((current) => (current ? { ...current, muted } : current));
      try {
        await pushApi.setMuted(muted);
      } catch (error) {
        setServer((current) =>
          current ? { ...current, muted: previous } : current,
        );
        toast.error("Preferenze non salvate", {
          description:
            error instanceof Error ? error.message : "Riprova fra poco.",
        });
      }
    },
    [server?.muted],
  );

  const enable = useCallback(
    async (muted?: NotificationCategory[]) => {
      if (support !== "supported") return false;
      setWorking(true);

      try {
        // Il permesso prima di ogni altra attesa: Safari lo concede solo
        // dentro il tocco che l'ha chiesto, e ogni `await` lo allontana.
        const result =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
        setPermission(result);

        if (result !== "granted") {
          snooze();
          toast.error("Notifiche non attivate", {
            description:
              result === "denied"
                ? deniedHelp()
                : "Puoi attivarle quando vuoi da Configurazione.",
          });
          return false;
        }

        const current = registration ?? (await registerServiceWorker());
        await navigator.serviceWorker.ready;

        const publicKey = server?.publicKey ?? (await reload()).publicKey;
        if (!publicKey) {
          throw new Error(
            "Le notifiche non sono ancora configurate sul server: manca la chiave VAPID.",
          );
        }

        let subscription = await current.pushManager.getSubscription();
        if (subscription && !matchesKey(subscription, publicKey)) {
          await subscription.unsubscribe();
          subscription = null;
        }
        subscription ??= await subscribe(current, publicKey);

        await pushApi.save(subscription);
        if (muted) await pushApi.setMuted(muted);

        setEndpoint(subscription.endpoint);
        await reload();

        toast.success("Notifiche attive", {
          description: "Da adesso arrivano anche su questo dispositivo.",
        });
        return true;
      } catch (error) {
        console.error("Notifiche non attivate:", error);
        toast.error("Notifiche non attivate", {
          description:
            error instanceof DOMException && error.name === "NotAllowedError"
              ? "Il browser non ha concesso il permesso. Riprova con un tocco su «Attiva»."
              : error instanceof Error
                ? error.message
                : "Riprova fra poco.",
        });
        return false;
      } finally {
        setWorking(false);
      }
    },
    [support, registration, server?.publicKey, reload],
  );

  const disable = useCallback(async () => {
    setWorking(true);
    try {
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await pushApi
          .remove({ endpoint: subscription.endpoint })
          .catch(() => {});
        await subscription.unsubscribe();
      }
      // Chi le spegne ha deciso: la richiesta non deve tornare a chiederlo.
      snooze();
      setEndpoint(null);
      await reload().catch(() => {});
      toast.success("Notifiche spente su questo dispositivo");
    } catch (error) {
      toast.error("Notifiche non spente", {
        description: error instanceof Error ? error.message : "Riprova.",
      });
    } finally {
      setWorking(false);
    }
  }, [registration, reload]);

  const sendTest = useCallback(async () => {
    if (!endpoint) return;
    try {
      await pushApi.test(endpoint);
      toast.success("Prova inviata", {
        description: "Dovrebbe arrivare entro qualche secondo.",
      });
    } catch (error) {
      toast.error("Prova non inviata", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
    }
  }, [endpoint]);

  const removeDevice = useCallback(
    async (device: PushDevice) => {
      if (device.endpoint === endpoint) return disable();
      try {
        await pushApi.remove({ id: device._id });
        await reload();
        toast.success("Dispositivo tolto", {
          description: `${device.device} non riceve più notifiche.`,
        });
      } catch (error) {
        toast.error("Dispositivo non tolto", {
          description:
            error instanceof Error ? error.message : "Riprova fra poco.",
        });
      }
    },
    [endpoint, disable, reload],
  );

  const closePrompt = useCallback((accepted: boolean) => {
    if (!accepted) snooze();
    setPromptOpen(false);
  }, []);

  const value = useMemo<PushContextValue>(
    () => ({
      support,
      permission,
      endpoint,
      configured: Boolean(server?.publicKey),
      loaded: server !== null,
      devices: server?.devices ?? [],
      muted: server?.muted ?? NONE,
      working,
      enable,
      disable,
      sendTest,
      setMuted,
      removeDevice,
      openPrompt: () => setPromptOpen(true),
    }),
    [
      support,
      permission,
      endpoint,
      server,
      working,
      enable,
      disable,
      sendTest,
      setMuted,
      removeDevice,
    ],
  );

  return (
    <PushContext.Provider value={value}>
      {children}
      <PushPrompt
        open={promptOpen}
        support={support}
        muted={server?.muted ?? NONE}
        working={working}
        onEnable={enable}
        onClose={closePrompt}
      />
    </PushContext.Provider>
  );
}
