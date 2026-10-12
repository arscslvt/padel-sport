"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { TOUR_VERSION } from "../_components/tour/steps";
import { TourOverlay } from "../_components/tour/tour-overlay";

/**
 * Il tour guidato della dashboard: parte da solo la prima volta che si apre
 * l'agenda, e si può rivedere quando si vuole (`useDashboardTour().start`).
 *
 * «Visto» vale per la persona e non per il telefono: si ricorda nei metadati
 * dell'utente Clerk, così chi l'ha già fatto al computer non se lo ritrova
 * sul telefono. Una copia nel browser evita che ricompaia se il salvataggio
 * su Clerk non riesce. Chiudere a metà conta come visto: chi chiude ha
 * deciso, e ritrovarselo a ogni apertura sarebbe peggio.
 *
 * Il contenitore qui sotto avvolge la dashboard: durante il tour è lui che
 * si rimpicciolisce nella cornice. Fuori dal tour è un `div` qualsiasi.
 */

const STORAGE_KEY = "dashboard-tour";

/** Dopo l'apertura dell'agenda: il tempo di vederla, prima di spiegarla. */
const AUTO_START_DELAY = 900;

interface TourContextValue {
  start: () => void;
  /**
   * Il tour è aperto, o deve ancora partire la prima volta: chi vuole
   * presentarsi da solo (la richiesta delle notifiche) aspetta che sia `false`
   * invece di comparirgli sopra.
   */
  busy: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useDashboardTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useDashboardTour va usato dentro TourProvider");
  }
  return context;
}

export default function TourProvider({ children }: { children: ReactNode }) {
  const { isLoaded, user } = useUser();
  const pathname = usePathname();
  const stageRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const seenRemotely =
    Number(user?.unsafeMetadata?.dashboardTour ?? 0) >= TOUR_VERSION;

  // La copia nel browser letta dopo il montaggio: sul server non c'è.
  const [seenHere, setSeenHere] = useState(false);
  useEffect(() => setSeenHere(seenLocally()), []);

  const start = useCallback(() => setOpen(true), []);

  const markSeen = useCallback(() => {
    setSeenHere(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(TOUR_VERSION));
    } catch {
      // Memoria del browser spenta o piena: resta il salvataggio su Clerk.
    }
    if (!user || seenRemotely) return;
    user
      .update({
        unsafeMetadata: { ...user.unsafeMetadata, dashboardTour: TOUR_VERSION },
      })
      .catch(() => {
        // Resta la copia nel browser: al massimo ricompare su un altro
        // dispositivo, che è meglio di un errore a schermo.
      });
  }, [user, seenRemotely]);

  // Un secondo «Chiudi» durante l'uscita (Esc, un tocco sul pannello che se
  // ne va) non deve salvare di nuovo.
  const closingRef = useRef(false);
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    markSeen();
    setClosing(true);
  }, [markSeen]);

  const closed = useCallback(() => {
    closingRef.current = false;
    setOpen(false);
    setClosing(false);
  }, []);

  // La prima volta, solo sull'agenda e solo se ci si è arrivati da sé: chi
  // apre il link di una notifica (`?booking=`) ha una cosa da fare adesso.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!isLoaded || !user || seenRemotely || autoStarted.current) return;
    if (pathname !== "/" || window.location.search) return;
    if (seenLocally()) return;

    const timer = window.setTimeout(() => {
      autoStarted.current = true;
      setOpen(true);
    }, AUTO_START_DELAY);
    return () => window.clearTimeout(timer);
  }, [isLoaded, user, seenRemotely, pathname]);

  const busy = open || !isLoaded || !(seenRemotely || seenHere);
  const value = useMemo(() => ({ start, busy }), [start, busy]);

  return (
    <TourContext.Provider value={value}>
      <div ref={stageRef}>{children}</div>
      {open && (
        <TourOverlay
          stage={stageRef}
          closing={closing}
          onClose={close}
          onClosed={closed}
        />
      )}
    </TourContext.Provider>
  );
}

function seenLocally() {
  try {
    return (
      Number(window.localStorage.getItem(STORAGE_KEY) ?? 0) >= TOUR_VERSION
    );
  } catch {
    return false;
  }
}
