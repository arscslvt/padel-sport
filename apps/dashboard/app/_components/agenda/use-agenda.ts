"use client";

import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import type { RefundOutcome } from "@padel-sport/backend/convex/modules/payments/refund";
import { formatEuro } from "@padel-sport/backend/convex/modules/pricing/lib";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useCounts } from "@/app/_providers/counts.provider";
import { PUSH_REFRESH_EVENT } from "@/lib/push";

import { type Booking, isPaidOnline, timeRange } from "./lib";

/**
 * Racconta all'operatore com'è andato un rimborso: quanto è tornato al
 * cliente, o perché non è tornato niente.
 */
function announceRefund(refund: RefundOutcome, cancelled: boolean) {
  if (refund.failed.length === 0) {
    toast.success(
      cancelled
        ? "Prenotazione annullata e rimborsata"
        : "Pagamento rimborsato",
      {
        description: `Restituiti ${formatEuro(refund.amount)} sulla carta del cliente.`,
      },
    );
    return;
  }

  toast.error(
    refund.refunded > 0
      ? "Rimborso riuscito solo in parte"
      : cancelled
        ? "Annullata, ma il rimborso non è riuscito"
        : "Rimborso non riuscito",
    {
      description: `${refund.failed[0]} Riprova dalla scheda della prenotazione, o rimborsa dal pannello SumUp.`,
      duration: 10_000,
    },
  );
}

/**
 * L'agenda e le azioni che la cambiano.
 *
 * Arriva da una route e non da `useQuery`: contiene nomi e telefoni dei
 * clienti, e il deployment Convex ha un URL pubblico. Per non perdere del
 * tutto l'aggiornamento in tempo reale si ricarica quando si torna sulla
 * scheda, ogni minuto, dopo ogni azione e quando arriva una notifica push
 * (push.provider.tsx).
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

    const onPush = () => void load(true);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(PUSH_REFRESH_EVENT, onPush);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(PUSH_REFRESH_EVENT, onPush);
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
        description: isPaidOnline(booking)
          ? `${booking.bookedBy} ha già pagato online.`
          : `${booking.bookedBy} pagherà in struttura all'arrivo.`,
        error: "Prenotazione non confermata",
      },
    );

  /**
   * Annulla, e con `refund` rimborsa anche il pagamento online. Il rimborso ha
   * il suo avviso: un annullamento riuscito con rimborso fallito va detto.
   */
  const cancel = async (booking: Booking, refund = false) => {
    setBusyId(booking._id);
    try {
      const payload = await request("/api/dashboard/bookings", "DELETE", {
        bookingId: booking._id,
        refund,
      });

      if (payload?.refund) {
        announceRefund(payload.refund as RefundOutcome, true);
      } else {
        toast.success("Prenotazione annullata", {
          description: `${booking.bookedBy} riceve l'avviso della cancellazione.`,
        });
      }

      await load(true);
      refreshCounts();
      return true;
    } catch (error) {
      toast.error("Prenotazione non annullata", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  /** Rimborsa dalla scheda: un pagamento solo, o tutti quelli incassati. */
  const refund = async (booking: Booking, paymentId?: string) => {
    setBusyId(booking._id);
    try {
      const response = await fetch("/api/dashboard/bookings/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking._id, paymentId }),
      });
      const payload = await response.json().catch(() => null);

      if (payload?.outcome) {
        announceRefund(payload.outcome as RefundOutcome, false);
      } else if (!response.ok) {
        throw new Error(payload?.error ?? "Riprova fra poco.");
      }

      await load(true);
      return response.ok;
    } catch (error) {
      toast.error("Rimborso non riuscito", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const updatePlayers = (booking: Booking, players: string[]) =>
    run(
      booking._id,
      () =>
        request("/api/dashboard/bookings/players", "POST", {
          bookingId: booking._id,
          players,
        }),
      {
        success: "Giocatori aggiornati",
        description: players.join(", "),
        error: "Impossibile salvare i giocatori",
      },
    );

  const reschedule = (booking: Booking, bookingDate: number, notify: boolean) =>
    run(
      booking._id,
      () =>
        request("/api/dashboard/bookings/reschedule", "POST", {
          bookingId: booking._id,
          bookingDate,
          notify,
        }),
      {
        success: "Orario aggiornato",
        description: notify
          ? `${timeRange(bookingDate)}. Il cliente riceverà un'email.`
          : `${timeRange(bookingDate)}. Il cliente non è stato avvisato.`,
        error: "Impossibile cambiare l'orario",
      },
    );

  const moveCourt = (booking: Booking, slotId: string) =>
    run(
      booking._id,
      () =>
        request("/api/dashboard/bookings/court", "POST", {
          bookingId: booking._id,
          slotId,
        }),
      {
        success: "Campo aggiornato",
        error: "Impossibile cambiare il campo",
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
    refund,
    updatePlayers,
    reschedule,
    moveCourt,
    split,
  };
}
