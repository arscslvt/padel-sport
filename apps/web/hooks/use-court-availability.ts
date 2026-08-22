"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";

import type { BookingDay, TimeSlot } from "@/lib/booking";
import {
  availableSlots,
  BOOKABLE_DAYS,
  bookableDays,
  combineDateAndTime,
  DEFAULT_WINDOWS,
  occupiedCourts,
  overlappingBlocks,
  overlappingBookings,
} from "@/lib/booking";

export interface CourtAvailability {
  /** I giorni proponibili, dal primo prenotabile in poi. */
  days: BookingDay[];
  /** Per ogni giorno, gli orari in cui resta libero almeno un campo. */
  slotsByDay: TimeSlot[][];
  /** Prenotazioni e campi non sono ancora arrivati: gli orari sono provvisori. */
  loading: boolean;
  /** Nessun campo attivo: senza, la griglia si svuoterebbe in silenzio. */
  noCourts: boolean;
}

/**
 * Giorni e orari in cui il club ha ancora un campo libero.
 *
 * Sta qui e non dentro il wizard di /book perché lo leggono in due: la pagina
 * di prenotazione e il modulo «cerco giocatori» della home. Era la stessa
 * intersezione — finestre di apertura, prenotazioni esistenti, appuntamenti
 * presi su SumUp — scritta due volte, e due copie prima o poi divergono.
 *
 * Gli appuntamenti esterni arrivano dal calendario condiviso, riletto da un
 * cron ogni cinque minuti: qui non forziamo la rilettura come fa /book, perché
 * questo hook gira anche sulla home e non vale una chiamata a ogni visita.
 *
 * Resta comunque un'indicazione: la parola definitiva è di Convex, alla
 * conferma della prenotazione.
 */
export function useCourtAvailability(): CourtAvailability {
  const settings = useQuery(api.modules.settings.booking.get, {});
  const windows = settings?.windows ?? DEFAULT_WINDOWS;

  const days = useMemo(
    () => bookableDays(settings?.bookableDays ?? BOOKABLE_DAYS),
    [settings?.bookableDays],
  );

  const range = useMemo(() => {
    const from = days[0].date.getTime();
    const last = new Date(days[days.length - 1].date);
    last.setHours(23, 59, 59, 999);
    return { from, to: last.getTime() };
  }, [days]);

  const availability = useQuery(api.bookings.availability.default, range);
  const courts = useQuery(api.slots.listActive.default);
  const loading = availability === undefined || courts === undefined;

  const slotsByDay = useMemo(() => {
    return days.map((day) => {
      const slots = availableSlots(day.date, windows);
      if (loading) return slots;

      return slots.filter((slot) => {
        const start = combineDateAndTime(day.date, slot.time);
        const overlapping = overlappingBookings(availability.busy, start);

        // Una prenotazione senza campo assegnato (righe vecchie) li blocca tutti.
        if (overlapping.some((booking) => !booking.slot)) return false;

        // Ogni appuntamento esterno toglie un campo: non sappiamo quale, ma
        // sappiamo che uno è occupato.
        const blocked = overlappingBlocks(availability.blocks, start);

        // Si contano i campi, non le prenotazioni: due gruppi uniti dalla
        // struttura ne occupano uno in due.
        return occupiedCourts(overlapping) + blocked.length < courts.length;
      });
    });
  }, [days, windows, availability, courts, loading]);

  return {
    days,
    slotsByDay,
    loading,
    noCourts: !loading && courts.length === 0,
  };
}
