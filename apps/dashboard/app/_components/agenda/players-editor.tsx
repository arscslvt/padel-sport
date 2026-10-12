"use client";

import { Loader2, Smartphone } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Drawer as DrawerPrimitive } from "vaul";

import { ListGroup, ListRow } from "@/app/_components/list";
import { SheetHeader } from "@/app/_components/sheet-header";
import { Button } from "@/components/ui/button";
import {
  DrawerClose,
  DrawerContent,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import type { Booking } from "./lib";

/**
 * La squadra di una prenotazione, corretta dallo staff.
 *
 * Chi è entrato dall'app compare ma non si tocca: si toglie dall'app, uscendo
 * dalla partita. Gli altri sono nomi da scrivere, con tanti posti vuoti quanti
 * la prenotazione ne ha ancora. Le regole vere stanno in Convex
 * (bookings/players.ts): qui si evita solo di mandare un nome di una lettera.
 *
 * Due forme, perché la scheda ne ha due. Da desktop la scheda è una modale
 * alta abbastanza, e il modulo si apre dentro (`PlayersEditor`). Da telefono è
 * un drawer dal basso già pieno: il modulo finirebbe sotto il bordo, con la
 * tastiera sopra. Lì si apre un drawer annidato (`PlayersDrawer`).
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

/** Legge i giocatori della prenotazione e tiene il modulo. */
function usePlayersForm(booking: Booking) {
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

  const setName = (index: number, value: string) =>
    setNames((current) =>
      current.map((name, position) => (position === index ? value : name)),
    );

  /** I nomi da salvare, bloccati compresi, o `null` se il modulo non va. */
  const collect = (): string[] | null => {
    if (!data) return null;

    const filled = names.map((name) => name.trim()).filter(Boolean);
    if (filled.some((name) => name.length < 2)) {
      toast.error("Ogni nome deve avere almeno due lettere.");
      return null;
    }
    if (data.locked.length + filled.length === 0) {
      toast.error("Serve almeno il nome di chi ha prenotato.");
      return null;
    }

    return [...data.locked, ...filled];
  };

  return { data, names, error, setName, collect };
}

type PlayersForm = ReturnType<typeof usePlayersForm>;

function PlayersFields({ form, title }: { form: PlayersForm; title?: string }) {
  const { data, names, error, setName } = form;

  const footer =
    data && data.locked.length === 0
      ? "Il primo nome è chi ha prenotato. Un posto lasciato vuoto è un giocatore che manca."
      : "Un posto lasciato vuoto è un giocatore che manca.";

  return (
    <ListGroup title={title} footer={footer}>
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
                onChange={(event) => setName(index, event.target.value)}
              />
            </div>
          ))}
        </>
      )}
    </ListGroup>
  );
}

/** Da desktop: il modulo dentro la scheda, sotto i dati. */
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
  const form = usePlayersForm(booking);

  const save = async () => {
    const players = form.collect();
    if (players && (await onSave(players))) onClose();
  };

  return (
    <div className="space-y-3">
      <PlayersFields form={form} title="Modifica giocatori" />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Annulla
        </Button>
        <Button onClick={() => void save()} disabled={busy || !form.data}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Salva giocatori
        </Button>
      </div>
    </div>
  );
}

/**
 * Da telefono: un drawer annidato sopra la scheda, come nell'esempio di Vaul
 * (`Drawer.NestedRoot` dentro il contenuto del drawer padre).
 *
 * Si apre dal suo `Trigger` e si chiude dai suoi `Close`, non cambiando `open`
 * da fuori: è così che Vaul avvisa la scheda sotto, che si rimpicciolisce
 * all'apertura e torna com'era alla chiusura. Dopo un salvataggio riuscito la
 * chiusura passa da un `Close` nascosto, per lo stesso motivo.
 */
export function PlayersDrawer({
  booking,
  busy,
  open,
  onOpenChange,
  onSave,
  children,
}: {
  booking: Booking;
  busy: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (players: string[]) => Promise<boolean>;
  /** La riga che lo apre: diventa il `Trigger`. */
  children: ReactNode;
}) {
  return (
    <DrawerPrimitive.NestedRoot open={open} onOpenChange={onOpenChange}>
      <DrawerPrimitive.Trigger asChild>{children}</DrawerPrimitive.Trigger>
      <DrawerContent>
        <SheetHeader
          title="Giocatori"
          description={`${booking.bookedBy}: chi gioca davvero.`}
        />
        {/* Il contenuto del drawer si monta all'apertura e si smonta dopo
            l'animazione di chiusura: il modulo rilegge i nomi ogni volta, e
            non sparisce mentre il drawer scende. */}
        <DrawerForm booking={booking} busy={busy} onSave={onSave} />
      </DrawerContent>
    </DrawerPrimitive.NestedRoot>
  );
}

function DrawerForm({
  booking,
  busy,
  onSave,
}: {
  booking: Booking;
  busy: boolean;
  onSave: (players: string[]) => Promise<boolean>;
}) {
  const form = usePlayersForm(booking);
  const close = useRef<HTMLButtonElement>(null);

  const save = async () => {
    const players = form.collect();
    if (players && (await onSave(players))) close.current?.click();
  };

  return (
    <>
      {/* Scorre solo il modulo: testata e bottoni restano fermi. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1">
        <PlayersFields form={form} />
      </div>

      <DrawerFooter className="flex flex-col-reverse gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <DrawerClose asChild>
          <Button variant="ghost" className="h-12 rounded-xl" disabled={busy}>
            Annulla
          </Button>
        </DrawerClose>
        <Button
          className="h-12 rounded-xl"
          onClick={() => void save()}
          disabled={busy || !form.data}
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          Salva giocatori
        </Button>
        <DrawerClose
          ref={close}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </DrawerFooter>
    </>
  );
}
