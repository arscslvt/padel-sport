"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Se l'elenco delle annullate in agenda è chiuso.
 *
 * Vale per tutta la dashboard, non per un giorno: chi lo chiude non vuole
 * vederle in nessun giorno, e lo ritrova chiuso anche alla prossima apertura.
 * La scelta resta nel browser (`localStorage`); se il browser non la tiene,
 * l'elenco torna aperto e niente si rompe.
 */

const STORAGE_KEY = "dashboard-agenda-hide-cancelled";

export function useHideCancelled(): [boolean, (hide: boolean) => void] {
  const [hide, setHide] = useState(false);

  // Letta dopo il primo render: sul server il browser non c'è, e leggerla
  // subito darebbe una pagina diversa da quella che il server ha mandato.
  useEffect(() => {
    try {
      setHide(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Memoria del browser non disponibile: l'elenco resta aperto.
    }
  }, []);

  const update = useCallback((next: boolean) => {
    setHide(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Senza memoria del browser la scelta vale fino alla prossima apertura.
    }
  }, []);

  return [hide, update];
}
