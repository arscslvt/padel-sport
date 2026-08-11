"use client";

import * as React from "react";

import { type ImminentEvent, pickImminent } from "@/lib/imminent-event";

/**
 * Evento da annunciare nella barra sotto la navigazione, o `null`.
 *
 * `enabled` evita la richiesta a chi non passa mai dalla home: il fetch parte
 * la prima volta che diventa vero e non si ripete. Il ricalcolo su
 * `visibilitychange` serve alle sessioni lasciate aperte — riaprendo la scheda
 * dopo ore l'evento nel frattempo concluso sparisce.
 */
export function useImminentEvent(enabled: boolean): ImminentEvent | null {
  const [events, setEvents] = React.useState<ImminentEvent[] | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!enabled || events) return;

    let cancelled = false;

    fetch("/api/imminent-event")
      .then((response) => response.json())
      .then((data: { events?: ImminentEvent[] }) => {
        if (!cancelled) setEvents(data.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, events]);

  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return events ? pickImminent(events, now) : null;
}
