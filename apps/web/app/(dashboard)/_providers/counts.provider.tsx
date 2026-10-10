"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CountKey } from "../_components/nav";

/**
 * I numeri sulla barra di navigazione: quante cose aspettano lo staff.
 *
 * Si aggiornano all'apertura, quando si torna sulla scheda del browser — è il
 * gesto di chi riprende il telefono in mano — e ogni minuto. Chi fa
 * un'azione che li cambia (accettare una prenotazione, chiudere una richiesta)
 * chiama `refresh` invece di aspettare il giro successivo.
 */

type Counts = Record<CountKey, number>;

interface CountsContextValue {
  counts: Counts | null;
  refresh: () => void;
}

const CountsContext = createContext<CountsContextValue>({
  counts: null,
  refresh: () => {},
});

const POLL_MS = 60_000;

export function useCounts() {
  return useContext(CountsContext);
}

export default function CountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<Counts | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/dashboard/counts")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: Counts | null) => {
        if (payload) setCounts(payload);
      })
      .catch(() => {
        // Un contatore che non si aggiorna non deve disturbare nessuno.
      });
  }, []);

  useEffect(() => {
    refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const value = useMemo(() => ({ counts, refresh }), [counts, refresh]);

  return (
    <CountsContext.Provider value={value}>{children}</CountsContext.Provider>
  );
}
