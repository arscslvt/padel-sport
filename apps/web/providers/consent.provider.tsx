"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "padel-cookie-consent";

/*
 * Un rifiuto non va riproposto a ogni visita: le Linee guida del Garante del
 * 10 giugno 2021 chiedono di non ripresentare il banner prima di sei mesi,
 * salvo cambino i trattamenti o i fornitori. Il consenso dato, al contrario,
 * non scade da solo: resta finché non lo si revoca dalle preferenze.
 */
const DENIAL_TTL_MS = 1000 * 60 * 60 * 24 * 183;

type ConsentChoice = "granted" | "denied";

type StoredConsent = { choice: ConsentChoice; at: number };

type ConsentState = {
  /**
   * `null` finché la scelta non è stata espressa (o non è ancora stata letta
   * dallo storage). Nessun default implicito: senza un sì esplicito non parte
   * niente.
   */
  analytics: boolean | null;
  /** Vero solo quando il banner deve comparire davvero. */
  needsChoice: boolean;
  grant: () => void;
  deny: () => void;
  /** Riapre il banner: è l'aggancio per revocare o cambiare idea. */
  reopen: () => void;
};

const ConsentContext = createContext<ConsentState | null>(null);

function readStoredConsent(): StoredConsent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (parsed.choice !== "granted" && parsed.choice !== "denied") return null;
    if (typeof parsed.at !== "number") return null;

    if (parsed.choice === "denied" && Date.now() - parsed.at > DENIAL_TTL_MS) {
      return null;
    }

    return { choice: parsed.choice, at: parsed.at };
  } catch {
    /*
     * localStorage può essere disabilitato o pieno. In quel caso non sappiamo
     * cosa abbia scelto la persona, e l'unica risposta corretta è trattarla
     * come se non avesse acconsentito.
     */
    return null;
  }
}

export function ConsentProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [consent, setConsent] = useState<StoredConsent | null>(null);
  /*
   * Lo storage si legge solo dopo il mount: leggerlo in render romperebbe
   * l'idratazione, e mostrare il banner prima della lettura lo farebbe
   * lampeggiare a ogni caricamento anche a chi ha già scelto.
   */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConsent(readStoredConsent());
    setHydrated(true);
  }, []);

  const persist = useCallback((choice: ConsentChoice) => {
    const next: StoredConsent = { choice, at: Date.now() };
    setConsent(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Scelta comunque valida per questa navigazione, solo non ricordata.
    }
  }, []);

  const value = useMemo<ConsentState>(
    () => ({
      analytics: consent ? consent.choice === "granted" : null,
      needsChoice: hydrated && consent === null,
      grant: () => persist("granted"),
      deny: () => persist("denied"),
      reopen: () => setConsent(null),
    }),
    [consent, hydrated, persist],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);

  if (!context) {
    throw new Error("useConsent va usato dentro <ConsentProvider>.");
  }

  return context;
}
