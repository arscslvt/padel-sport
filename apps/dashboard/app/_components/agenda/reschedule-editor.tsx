"use client";

import { RotateCw } from "lucide-react";
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
} from "@/app/_components/nested-drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { type Booking, dayKey, dayLabel, timeRange } from "./lib";

/**
 * L'orario di una prenotazione, spostato dallo staff nello stesso giorno.
 *
 * Gli orari li propone il server (bookings/reschedule.ts): solo quelli dentro
 * le fasce di apertura, ancora da venire, con un campo libero contando anche
 * SumUp. Qui si sceglie, si vede se il campo cambia, e si decide se avvisare
 * il cliente.
 *
 * Due forme come per i giocatori: da desktop il modulo si apre dentro la
 * scheda (`RescheduleEditor`), da telefono in un drawer annidato
 * (`RescheduleDrawer`).
 */

interface TimeOption {
  start: number;
  time: string;
  current: boolean;
  available: boolean;
  /** Il campo che toccherebbe, quando non è quello di adesso. */
  court?: string;
}

interface Options {
  /** Perché non si può spostare, detto al cliente in chiaro. */
  blocker: string | null;
  current: number;
  currentCourt?: string;
  times: TimeOption[];
}

/** Legge gli orari proponibili e tiene la scelta. */
function useRescheduleForm(booking: Booking) {
  const [options, setOptions] = useState<Options | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [notify, setNotify] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` serve a ricaricare con «Riprova».
  useEffect(() => {
    let alive = true;
    setLoadError(null);

    void (async () => {
      try {
        const response = await fetch(
          `/api/dashboard/bookings/reschedule?bookingId=${encodeURIComponent(booking._id)}`,
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error);
        if (alive) setOptions(payload);
      } catch {
        if (alive) {
          setLoadError(
            "Non riesco a caricare gli orari liberi. Controlla la connessione e riprova.",
          );
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [booking._id, attempt]);

  const choice =
    options?.times.find((option) => option.start === selected) ?? null;

  return {
    options,
    loadError,
    selected,
    choice,
    notify,
    setSelected,
    setNotify,
    retry: () => setAttempt((current) => current + 1),
  };
}

type RescheduleForm = ReturnType<typeof useRescheduleForm>;

function submitLabel(form: RescheduleForm): string {
  return form.choice ? `Sposta alle ${form.choice.time}` : "Sposta";
}

function TimeFields({
  form,
  booking,
  busy,
  title,
  groupRef,
}: {
  form: RescheduleForm;
  booking: Booking;
  busy: boolean;
  title?: string;
  /** Il gruppo degli orari, per portarci il fuoco da desktop. */
  groupRef?: React.Ref<HTMLFieldSetElement>;
}) {
  const { options, loadError, selected, choice } = form;
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
        <div aria-busy="true" className="grid grid-cols-4 gap-2 p-4">
          <output className="sr-only">Sto cercando gli orari liberi…</output>
          {Array.from({ length: 8 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: segnaposto fissi.
            <Skeleton key={index} className="h-11 rounded-xl" />
          ))}
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

  const choosable = options.times.filter((option) => option.available);
  const day = dayLabel(dayKey(booking.bookingDate));

  return (
    <div className="space-y-5">
      <ListGroup
        title={title}
        footer={`Si gioca ${day.charAt(0).toLowerCase()}${day.slice(1)}. Per cambiare giorno annulla la prenotazione e rifalla.`}
      >
        {/* Radio veri, nascosti alla vista dentro etichette disegnate come
            bottoni: frecce, Tab e lettori di schermo funzionano come in ogni
            gruppo di scelte, senza codice nostro. */}
        <fieldset ref={groupRef} disabled={busy} className="space-y-3 p-4">
          <legend className="mb-3 text-[13px] font-medium">
            Scegli il nuovo orario
          </legend>

          {choosable.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Oggi non ci sono altri orari con un campo libero.
            </p>
          ) : null}

          <div className="grid grid-cols-4 gap-2">
            {options.times.map((option) => {
              const checked = option.start === selected;
              return (
                <label
                  key={option.start}
                  className={cn(
                    "flex h-11 cursor-pointer items-center justify-center rounded-xl border text-[15px] tabular-nums",
                    "has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-[3px]",
                    "has-[:disabled]:cursor-not-allowed",
                    PRESS,
                    checked
                      ? "bg-foreground text-background border-foreground"
                      : option.current
                        ? "bg-muted border-dashed border-foreground/40"
                        : "bg-card has-[:disabled]:line-through has-[:disabled]:opacity-35",
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-time`}
                    value={option.start}
                    checked={checked}
                    disabled={!option.available}
                    onChange={() => form.setSelected(option.start)}
                    className="sr-only"
                  />
                  {option.time}
                  <span className="sr-only">
                    {option.current
                      ? ", orario attuale"
                      : option.available
                        ? ""
                        : ", occupato"}
                  </span>
                </label>
              );
            })}
          </div>

          <p
            aria-live="polite"
            className="text-muted-foreground min-h-5 text-[13px] leading-relaxed"
          >
            {choice
              ? choice.court
                ? `Alle ${choice.time} il ${options.currentCourt ?? "campo di adesso"} è occupato, quindi la partita passa al ${choice.court}.`
                : `La partita si sposta alle ${timeRange(choice.start)}, sullo stesso campo.`
              : `Adesso è alle ${timeRange(options.current)}. L'orario tratteggiato è quello attuale.`}
          </p>
        </fieldset>
      </ListGroup>

      <ListGroup>
        <label
          htmlFor={`${id}-notify`}
          className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] leading-snug">
              Avvisa il cliente via email
            </span>
            <span className="text-muted-foreground mt-0.5 block text-[13px] leading-snug">
              Riceve una mail con il nuovo orario.
            </span>
          </span>
          <Switch
            id={`${id}-notify`}
            checked={form.notify}
            disabled={busy}
            onCheckedChange={form.setNotify}
          />
        </label>
      </ListGroup>
    </div>
  );
}

/** Da desktop: il modulo dentro la scheda, sotto i dati. */
export function RescheduleEditor({
  booking,
  busy,
  onSave,
  onClose,
}: {
  booking: Booking;
  busy: boolean;
  /** Il nuovo inizio e la spunta dell'avviso. Dice se è andata. */
  onSave: (bookingDate: number, notify: boolean) => Promise<boolean>;
  onClose: () => void;
}) {
  const form = useRescheduleForm(booking);
  const container = useRef<HTMLFormElement>(null);
  const group = useRef<HTMLFieldSetElement>(null);
  const focused = useRef(false);

  // Aperto con un clic, il modulo deve farsi trovare: in vista, e il fuoco
  // sul primo orario che si può scegliere.
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
      ?.querySelector<HTMLInputElement>("input:not(:disabled)")
      ?.focus({ preventScroll: true });
  }, [form.options]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.selected === null) return;
    if (await onSave(form.selected, form.notify)) onClose();
  };

  return (
    <form ref={container} className="space-y-3" onSubmit={submit} noValidate>
      <TimeFields
        form={form}
        booking={booking}
        busy={busy}
        title="Cambia orario"
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
          disabled={busy || form.selected === null}
        >
          <SubmitLabel busy={busy} label={submitLabel(form)} />
        </Button>
      </div>
    </form>
  );
}

/** Da telefono: un drawer annidato sopra la scheda (nested-drawer.tsx). */
export function RescheduleDrawer({
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
  onSave: (bookingDate: number, notify: boolean) => Promise<boolean>;
  /** La riga che lo apre. */
  children: ReactNode;
}) {
  return (
    <NestedDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Cambia orario"
      description={`Prenotazione di ${booking.bookedBy} · ${dayLabel(dayKey(booking.bookingDate))}`}
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
  onSave: (bookingDate: number, notify: boolean) => Promise<boolean>;
}) {
  const form = useRescheduleForm(booking);
  const close = useCloseNested();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.selected === null) return;
    if (await onSave(form.selected, form.notify)) close();
  };

  return (
    <NestedDrawerForm
      onSubmit={submit}
      busy={busy}
      canSubmit={form.selected !== null}
      submitLabel={submitLabel(form)}
    >
      <TimeFields form={form} booking={booking} busy={busy} />
    </NestedDrawerForm>
  );
}
