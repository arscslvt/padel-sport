"use client";

import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import type { RetryTarget } from "@padel-sport/backend/convex/modules/deliveries/retry";
import type { RefundOutcome } from "@padel-sport/backend/convex/modules/payments/refund";
import { formatEuro } from "@padel-sport/backend/convex/modules/pricing/lib";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useCounts } from "@/app/_providers/counts.provider";
import { PUSH_REFRESH_EVENT } from "@/lib/push";

import { type Booking, isPaidOnline, timeRange } from "./lib";
import type { PlayersPayload } from "./players-editor";

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
          ? "È già pagata online."
          : "Si paga in struttura all'arrivo.",
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
          description: "È partito l'avviso della cancellazione.",
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

  const updatePlayers = (
    booking: Booking,
    { players, links }: PlayersPayload,
  ) =>
    run(
      booking._id,
      () =>
        request("/api/dashboard/bookings/players", "POST", {
          bookingId: booking._id,
          players,
          links,
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

  /**
   * Rimanda il WhatsApp di conferma, al numero corretto se serve. L'esito
   * vero arriva dopo, nella scheda: qui si dice solo che è ripartito.
   */
  const resendWhatsapp = async (
    booking: Booking,
    phone: string,
    /** Un giocatore della prenotazione invece di chi l'ha presa. */
    playerId?: Id<"players">,
  ) => {
    setBusyId(booking._id);
    try {
      const payload = await request(
        "/api/dashboard/bookings/whatsapp",
        "POST",
        {
          bookingId: booking._id,
          phone,
          playerId,
        },
      );

      toast.success("WhatsApp rimandato", {
        description: payload?.clientUpdated
          ? `A ${payload.phone}. Numero corretto anche nella scheda cliente.`
          : `A ${payload?.phone ?? phone}. L'esito compare fra gli avvisi al cliente.`,
      });

      // Il tentativo nuovo lo scrive l'invio, un attimo dopo, e Twilio dice
      // com'è andata in pochi secondi: si ricarica allora, senza aspettare il
      // giro del minuto, e il dettaglio aperto si aggiorna da solo.
      setTimeout(() => void load(true), 1_500);
      setTimeout(() => void load(true), 6_000);
      return true;
    } catch (error) {
      toast.error("WhatsApp non rimandato", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  /** Rimanda la mail di conferma a una persona che non l'ha ricevuta. */
  const resendEmail = async (
    booking: Booking,
    target: RetryTarget,
    name: string,
  ) => {
    setBusyId(booking._id);
    try {
      await request("/api/dashboard/bookings/email", "POST", {
        bookingId: booking._id,
        target,
      });

      toast.success("Mail rimandata", {
        description: `A ${name}. L'esito compare fra gli avvisi.`,
      });

      // La riga nuova la scrive l'invio, quando il sito ha risposto.
      setTimeout(() => void load(true), 3_000);
      return true;
    } catch (error) {
      toast.error("Mail non rimandata", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  /**
   * La conferma ai giocatori collegati che non l'hanno mai avuta: le
   * prenotazioni confermate prima che andasse a tutta la squadra.
   */
  const notifyMissing = async (booking: Booking) => {
    setBusyId(booking._id);
    try {
      const payload = await request(
        "/api/dashboard/bookings/notify-players",
        "POST",
        { bookingId: booking._id },
      );
      const names: string[] = payload?.names ?? [];
      toast.success("Conferma inviata", {
        description: `A ${names.join(", ")}. L'esito compare fra gli avvisi.`,
      });
      setTimeout(() => void load(true), 3_000);
      setTimeout(() => void load(true), 8_000);
      return true;
    } catch (error) {
      toast.error("Conferma non inviata", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const updatePhone = (booking: Booking, phone: string) =>
    run(
      booking._id,
      () =>
        request("/api/dashboard/bookings/phone", "POST", {
          bookingId: booking._id,
          phone,
        }),
      {
        success: "Telefono salvato",
        description:
          "Solo su questa prenotazione: la scheda cliente non cambia.",
        error: "Impossibile salvare il numero",
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
    updatePhone,
    resendWhatsapp,
    resendEmail,
    notifyMissing,
    split,
  };
}
