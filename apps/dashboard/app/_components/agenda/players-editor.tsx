"use client";

import { Loader2, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ListGroup, ListRow } from "@/app/_components/list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import type { Booking } from "./lib";

/**
 * La squadra di una prenotazione, corretta dallo staff dentro la scheda.
 *
 * Chi è entrato dall'app compare ma non si tocca: si toglie dall'app, uscendo
 * dalla partita. Gli altri sono nomi da scrivere, con tanti posti vuoti quanti
 * la prenotazione ne ha ancora. Le regole vere stanno in Convex
 * (bookings/players.ts): qui si evita solo di mandare un nome di una lettera.
 */

interface EditData {
  /** In partita con l'app: si vedono, non si cambiano. */
  locked: string[];
  /** Il massimo di nomi per questa prenotazione. */
  seats: number;
}

/** Toglie da `names` una occorrenza per ciascun nome di `remove`. */
function without(names: string[], remove: string[]): string[] {
  const rest = [...names];
  for (const name of remove) {
    const index = rest.indexOf(name);
    if (index !== -1) rest.splice(index, 1);
  }
  return rest;
}

export function PlayersEditor({
  booking,
  busy,
  onSave,
  onClose,
}: {
  booking: Booking;
  busy: boolean;
  /** Tutti i nomi nell'ordine, bloccati compresi. Dice se è andata. */
  onSave: (players: string[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const [data, setData] = useState<EditData | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const response = await fetch(
          `/api/dashboard/bookings/players?bookingId=${encodeURIComponent(booking._id)}`,
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload?.error ?? "Non riesco a leggere i giocatori.",
          );
        }
        if (!alive) return;

        const locked: string[] = payload.locked;
        const editable = without(payload.players, locked);
        const slots = Math.max(editable.length, payload.seats - locked.length);

        setNames([
          ...editable,
          ...Array.from({ length: slots - editable.length }, () => ""),
        ]);
        setData({ locked, seats: payload.seats });
      } catch (caught) {
        if (alive) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Non riesco a leggere i giocatori.",
          );
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [booking._id]);

  const save = async () => {
    if (!data) return;

    const filled = names.map((name) => name.trim()).filter(Boolean);
    if (filled.some((name) => name.length < 2)) {
      toast.error("Ogni nome deve avere almeno due lettere.");
      return;
    }
    if (data.locked.length + filled.length === 0) {
      toast.error("Serve almeno il nome di chi ha prenotato.");
      return;
    }

    if (await onSave([...data.locked, ...filled])) onClose();
  };

  const footer =
    data && data.locked.length === 0
      ? "Il primo nome è chi ha prenotato. Un posto lasciato vuoto è un giocatore che manca."
      : "Un posto lasciato vuoto è un giocatore che manca.";

  return (
    <div className="space-y-3">
      <ListGroup title="Modifica giocatori" footer={footer}>
        {error ? (
          <p className="text-danger px-4 py-3 text-sm">{error}</p>
        ) : !data ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <>
            {data.locked.map((name, index) => (
              <ListRow
                key={`locked-${index}-${name}`}
                leading={<Smartphone className="size-5" />}
                title={name}
                subtitle="Entrato dall'app: si toglie solo dall'app"
              />
            ))}
            {names.map((name, index) => (
              // La posizione è l'identità del campo: i nomi cambiano mentre
              // si scrive, e possono anche ripetersi.
              // biome-ignore lint/suspicious/noArrayIndexKey: posti fissi, non si riordinano.
              <div key={index} className="px-4 py-2.5">
                <Input
                  aria-label={`Giocatore ${data.locked.length + index + 1}`}
                  value={name}
                  maxLength={60}
                  placeholder={
                    data.locked.length === 0 && index === 0
                      ? "Chi ha prenotato"
                      : "Nome del giocatore"
                  }
                  onChange={(event) =>
                    setNames((current) =>
                      current.map((value, position) =>
                        position === index ? event.target.value : value,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </>
        )}
      </ListGroup>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Annulla
        </Button>
        <Button onClick={() => void save()} disabled={busy || !data}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Salva giocatori
        </Button>
      </div>
    </div>
  );
}
