"use client";

import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useCounts } from "@/app/(dashboard)/_providers/counts.provider";

import type { Booking } from "./lib";

/**
 * L'agenda e le azioni che la cambiano.
 *
 * Arriva da una route e non da `useQuery`: contiene nomi e telefoni dei
 * clienti, e il deployment Convex ha un URL pubblico. Per non perdere del
 * tutto l'aggiornamento in tempo reale si ricarica quando si torna sulla
 * scheda e ogni minuto, oltre che dopo ogni azione.
 */

const POLL_MS = 60_000;

async function request(
  path: string,
  method: "POST" | "DELETE",
  body: Record<string, unknown>,
) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? "Riprova fra poco.");
  }
  return payload;
}

export function useAgenda() {
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined);
  /** La prenotazione su cui è in corso un'azione: il suo pulsante gira. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const { refresh: refreshCounts } = useCounts();

  const load = useCallback(async (quiet = false) => {
    try {
      const response = await fetch("/api/dashboard/bookings");
      const payload = await response.json().catch(() => null);

      if (!response.ok) throw new Error(payload?.error);
      setBookings(payload.bookings ?? []);
    } catch (error) {
      // Un aggiornamento in sottofondo che fallisce non merita un avviso: la
      // pagina resta com'era e ci riprova fra un minuto.
      if (quiet) return;
      toast.error("Agenda non caricata", {
        description:
          error instanceof Error && error.message
            ? error.message
            : "Controlla la connessione e riprova.",
      });
      setBookings((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void load();

    const onVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, POLL_MS);

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  /** Esegue un'azione, poi riallinea agenda e contatori. Dice se è riuscita. */
  const run = useCallback(
    async (
      bookingId: string,
      action: () => Promise<unknown>,
      messages: { success: string; description?: string; error: string },
    ) => {
      setBusyId(bookingId);
      try {
        await action();
        toast.success(messages.success, { description: messages.description });
        await load(true);
        refreshCounts();
        return true;
      } catch (error) {
        toast.error(messages.error, {
          description:
            error instanceof Error ? error.message : "Riprova fra poco.",
        });
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [load, refreshCounts],
  );

  const accept = (booking: Booking, withNotification: boolean) =>
    run(
      booking._id,
      () =>
        request("/api/dashboard/bookings", "POST", {
          bookingId: booking._id,
          withNotification,
        }),
      {
        success: "Prenotazione confermata",
        description: `${booking.bookedBy} pagherà in struttura all'arrivo.`,
        error: "Prenotazione non confermata",
      },
    );

  const cancel = (booking: Booking) =>
    run(
      booking._id,
      () =>
        request("/api/dashboard/bookings", "DELETE", {
          bookingId: booking._id,
        }),
      {
        success: "Prenotazione annullata",
        description: `${booking.bookedBy} riceve l'avviso della cancellazione.`,
        error: "Prenotazione non annullata",
      },
    );

  const split = (booking: Booking) =>
    run(
      booking._id,
      () =>
        request("/api/dashboard/bookings/merge", "DELETE", {
          bookingId: booking._id as Id<"bookings">,
        }),
      {
        success: "Campi separati",
        description: "Le due prenotazioni tornano su campi distinti.",
        error: "Campi non separati",
      },
    );

  return {
    bookings,
    busyId,
    reload: () => load(true),
    accept,
    cancel,
    split,
  };
}
