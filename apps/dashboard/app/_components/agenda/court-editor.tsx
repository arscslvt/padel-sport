"use client";

import { Check, RotateCw } from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { ListGroup } from "@/app/_components/list";
import {
  NestedDrawer,
  NestedDrawerForm,
  PRESS,
  SubmitLabel,
  useCloseNested,
  useNestedDirty,
} from "@/app/_components/nested-drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { type Booking, dayKey, dayLabel, timeRange } from "./lib";

/**
 * Il campo di una prenotazione, cambiato dallo staff alla stessa ora.
 *
 * I campi liberi li dice il server (bookings/court.ts). Qui si sceglie da un
 * elenco come quelli delle Impostazioni di iOS: un campo per riga, la spunta
 * su quello scelto. Una prenotazione su più campi ne sceglie altrettanti:
 * ogni riga si spunta e si toglie, finché il conto torna. Due forme come per orario e giocatori: da desktop dentro
 * la scheda (`CourtEditor`), da telefono in un drawer annidato (`CourtDrawer`).
 */

interface CourtOption {
  id: string;
  name: string;
  current: boolean;
  available: boolean;
}

interface Options {
  blocker: string | null;
  /** Divide il campo con un'altra prenotazione: si spostano insieme. */
  shared: boolean;
  /** Quanti campi va scelti: quanti ne occupa adesso. */
  count: number;
  courts: CourtOption[];
}

function useCourtForm(booking: Booking) {
  const [options, setOptions] = useState<Options | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<string[] | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` serve a ricaricare con «Riprova».
  useEffect(() => {
    let alive = true;
    setLoadError(null);

    void (async () => {
      try {
        const response = await fetch(
          `/api/dashboard/bookings/court?bookingId=${encodeURIComponent(booking._id)}`,
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error);
        if (!alive) return;
        setOptions(payload);
        // Si parte dai campi di adesso, già spuntati: si cambia toccandone
        // un altro, come in ogni elenco di scelte.
        setSelected(
          (current) =>
            current ??
            (payload.courts ?? [])
              .filter((court: CourtOption) => court.current)
              .map((court: CourtOption) => court.id),
        );
      } catch {
        if (alive) {
          setLoadError(
            "Impossibile caricare i campi. Controlla la connessione e riprova.",
          );
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [booking._id, attempt]);

  const count = options?.count ?? 1;
  const picked = selected ?? [];
  /** Tanti campi quanti servono, e non gli stessi di adesso: si può salvare. */
  const changed =
    picked.length === count &&
    picked.some(
      (id) => !options?.courts.find((court) => court.id === id)?.current,
    );
  const choice = changed
    ? (options?.courts.filter((court) => picked.includes(court.id)) ?? [])
    : [];

  /** Con un campo solo si sostituisce; con più, si spunta e si toglie. */
  const toggle = (id: string) =>
    setSelected((current) => {
      const list = current ?? [];
      if (count === 1) return [id];
      if (list.includes(id)) return list.filter((other) => other !== id);
      return list.length < count ? [...list, id] : list;
    });

  return {
    options,
    loadError,
    selected: picked,
    count,
    choice,
    changed,
    toggle,
    retry: () => setAttempt((current) => current + 1),
  };
}

type CourtForm = ReturnType<typeof useCourtForm>;

function submitLabel(form: CourtForm): string {
  if (form.choice.length === 1) return `Sposta sul ${form.choice[0].name}`;
  return form.choice.length > 1 ? "Sposta sui campi scelti" : "Sposta";
}

function CourtFields({
  form,
  busy,
  title,
  groupRef,
}: {
  form: CourtForm;
  busy: boolean;
  title?: string;
  /** L'elenco dei campi, per portarci il fuoco da desktop. */
  groupRef?: React.Ref<HTMLFieldSetElement>;
}) {
  const { options, loadError, selected } = form;
  const id = useId();

  if (loadError) {
    return (
      <ListGroup title={title}>
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <p className="text-danger text-sm">{loadError}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={PRESS}
            onClick={form.retry}
          >
            <RotateCw aria-hidden />
            Riprova
          </Button>
        </div>
      </ListGroup>
    );
  }

  if (!options) {
    return (
      <ListGroup title={title}>
        <div aria-busy="true" className="space-y-2 p-4">
          <output className="sr-only">Caricamento dei campi…</output>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </ListGroup>
    );
  }

  if (options.blocker) {
    return (
      <ListGroup title={title}>
        <p role="alert" className="px-4 py-3 text-sm">
          {options.blocker}
        </p>
      </ListGroup>
    );
  }

  const multiple = form.count > 1;
  const full = selected.length >= form.count;
  const footer = options.shared
    ? "Anche la prenotazione abbinata si sposta sul nuovo campo."
    : multiple
      ? `Scegli ${form.count} campi: ${selected.length} di ${form.count} spuntati.`
      : "Il cliente vede il nuovo campo nella pagina della prenotazione.";

  return (
    <ListGroup title={title} footer={footer}>
      {/* Radio veri dentro righe da toccare: frecce, Tab e lettori di
          schermo funzionano come in ogni gruppo di scelte. */}
      <fieldset ref={groupRef} disabled={busy} className="min-w-0">
        <legend className="sr-only">{multiple ? "Campi" : "Campo"}</legend>
        <div className="divide-y">
          {options.courts.map((court) => {
            const checked = selected.includes(court.id);
            // Con più campi, a conto pieno se ne toglie uno prima di
            // spuntarne un altro.
            const unavailable =
              (!court.available && !court.current) ||
              (multiple && full && !checked);
            return (
              <label
                key={court.id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors",
                  "active:bg-muted/80 md:hover:bg-muted/50 has-[:focus-visible]:bg-muted/60",
                  "has-[:disabled]:cursor-not-allowed has-[:disabled]:active:bg-transparent md:has-[:disabled]:hover:bg-transparent",
                )}
              >
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={`${id}-court`}
                  value={court.id}
                  checked={checked}
                  disabled={unavailable}
                  onChange={() => form.toggle(court.id)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[15px] leading-snug",
                    !court.available &&
                      !court.current &&
                      "text-muted-foreground",
                  )}
                >
                  {court.name}
                </span>
                {court.current ? (
                  <span className="text-muted-foreground text-[13px]">
                    Attuale
                  </span>
                ) : !court.available ? (
                  <span className="text-muted-foreground text-[13px]">
                    Occupato
                  </span>
                ) : null}
                <Check
                  aria-hidden
                  className={cn(
                    "text-foreground size-5 shrink-0",
                    !checked && "invisible",
                  )}
                />
              </label>
            );
          })}
        </div>
      </fieldset>
    </ListGroup>
  );
}

/** Da desktop: il modulo dentro la scheda, sotto i dati. */
export function CourtEditor({
  booking,
  busy,
  onSave,
  onClose,
}: {
  booking: Booking;
  busy: boolean;
  /** I campi scelti. Dice se è andata. */
  onSave: (slotIds: string[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const form = useCourtForm(booking);
  const container = useRef<HTMLFormElement>(null);
  const group = useRef<HTMLFieldSetElement>(null);
  const focused = useRef(false);

  // Aperto con un clic, il modulo deve farsi trovare: in vista, e il fuoco
  // sul primo campo che si può scegliere.
  useEffect(() => {
    if (!form.options || focused.current) return;
    focused.current = true;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    container.current?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
    group.current
      ?.querySelector<HTMLInputElement>("input:checked, input:not(:disabled)")
      ?.focus({ preventScroll: true });
  }, [form.options]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.changed) return;
    if (await onSave(form.selected)) onClose();
  };

  return (
    <form ref={container} className="space-y-3" onSubmit={submit} noValidate>
      <CourtFields
        form={form}
        busy={busy}
        title={form.count > 1 ? "Campi" : "Campo"}
        groupRef={group}
      />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className={PRESS}
          onClick={onClose}
          disabled={busy}
        >
          Annulla
        </Button>
        <Button
          type="submit"
          className={PRESS}
          disabled={busy || !form.changed}
        >
          <SubmitLabel busy={busy} label={submitLabel(form)} />
        </Button>
      </div>
    </form>
  );
}

/** Da telefono: un drawer annidato sopra la scheda (nested-drawer.tsx). */
export function CourtDrawer({
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
  onSave: (slotIds: string[]) => Promise<boolean>;
  /** La riga che lo apre. */
  children: ReactNode;
}) {
  return (
    <NestedDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Campo"
      description={`${dayLabel(dayKey(booking.bookingDate))}, ${timeRange(booking.bookingDate)}`}
      trigger={children}
    >
      <DrawerForm booking={booking} busy={busy} onSave={onSave} />
    </NestedDrawer>
  );
}

function DrawerForm({
  booking,
  busy,
  onSave,
}: {
  booking: Booking;
  busy: boolean;
  onSave: (slotIds: string[]) => Promise<boolean>;
}) {
  const form = useCourtForm(booking);
  const close = useCloseNested();
  useNestedDirty(form.changed);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.changed) return;
    if (await onSave(form.selected)) close();
  };

  return (
    <NestedDrawerForm
      onSubmit={submit}
      busy={busy}
      canSubmit={form.changed}
      submitLabel={submitLabel(form)}
    >
      <CourtFields form={form} busy={busy} />
    </NestedDrawerForm>
  );
}
