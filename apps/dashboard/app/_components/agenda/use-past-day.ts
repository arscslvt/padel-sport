"use client";

import { useCallback, useEffect, useState } from "react";

import type { Booking } from "./lib";

/**
 * Le prenotazioni di un giorno già passato, aperto dal calendario
 * dell'agenda. L'agenda di tutti i giorni parte da oggi (use-agenda.ts):
 * il passato si chiede un giorno alla volta, solo quando serve.
 *
 * `undefined` mentre arrivano, `null` senza un giorno scelto.
 */
export function usePastDay(day: string | null) {
  const [rows, setRows] = useState<Booking[] | null | undefined>(null);

  const load = useCallback(async (key: string) => {
    // Da mezzanotte a mezzanotte, ora del browser: è quella del club.
    const from = new Date(`${key}T00:00:00`).getTime();
    const to = new Date(`${key}T00:00:00`);
    to.setDate(to.getDate() + 1);

    try {
      const response = await fetch(
        `/api/dashboard/bookings?from=${from}&to=${to.getTime()}`,
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error);
      setRows(payload.bookings ?? []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    if (!day) {
      setRows(null);
      return;
    }
    setRows(undefined);
    void load(day);
  }, [day, load]);

  const reload = useCallback(() => {
    if (day) void load(day);
  }, [day, load]);

  return { rows, reload };
}
