"use client";

import { Phone, UserRound } from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { ListGroup, ListRow } from "@/app/_components/list";
import {
  NestedDrawer,
  NestedDrawerForm,
  PRESS,
  SubmitLabel,
  useCloseNested,
  useNestedDirty,
} from "@/app/_components/nested-drawer";
import { Button } from "@/components/ui/button";

import { type Booking, dayKey, dayLabel, timeRange } from "./lib";

/**
 * Il numero di chi ha prenotato, scritto o corretto dallo staff.
 *
 * È il numero della prenotazione: quello che chiama «Chiama» e a cui parte la
 * conferma su WhatsApp. Salvarlo non manda niente. Due forme come orario e
 * campo: da desktop dentro la scheda (`PhoneEditor`), da telefono in un
 * drawer annidato (`PhoneDrawer`).
 */

function usePhoneForm(booking: Booking) {
  const initial = booking.phone?.trim() ?? "";
  const [phone, setPhone] = useState(initial);
  const value = phone.trim();
  return {
    phone,
    setPhone,
    value,
    changed: value.length > 0 && value !== initial,
  };
}

type PhoneForm = ReturnType<typeof usePhoneForm>;

const FOOTER =
  "Vale solo per questa prenotazione: la scheda cliente non cambia. Salvare non manda messaggi.";

function PhoneFields({
  booking,
  form,
  busy,
  title,
  inputRef,
}: {
  booking: Booking;
  form: PhoneForm;
  busy: boolean;
  title?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const id = useId();
  // Il numero della scheda, quando è diverso da quello scritto: un tocco e
  // lo si porta qui, senza ricopiarlo a mano.
  const card = booking.bookerCardPhone;

  return (
    <ListGroup title={title} footer={FOOTER}>
      <label
        htmlFor={id}
        className="flex min-h-14 items-center gap-3 px-4 py-2.5"
      >
        <Phone aria-hidden className="text-muted-foreground size-5" />
        <span className="sr-only">Numero di telefono</span>
        <input
          ref={inputRef}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.phone}
          disabled={busy}
          placeholder="+39 333 123 4567"
          onChange={(event) => form.setPhone(event.target.value)}
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base outline-none md:text-[15px]"
        />
      </label>
      {card && card !== form.phone.trim() && (
        <ListRow
          leading={<UserRound className="size-5" />}
          title="Usa il numero della scheda cliente"
          subtitle={card}
          onClick={busy ? undefined : () => form.setPhone(card)}
        />
      )}
    </ListGroup>
  );
}

/** Da desktop: il modulo dentro la scheda, sotto i dati. */
export function PhoneEditor({
  booking,
  busy,
  onSave,
  onClose,
}: {
  booking: Booking;
  busy: boolean;
  /** Il numero da salvare. Dice se è andata. */
  onSave: (phone: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const form = usePhoneForm(booking);
  const container = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Aperto con un clic, il modulo deve farsi trovare: in vista, e il fuoco
  // sul numero.
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    container.current?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
    input.current?.focus({ preventScroll: true });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.changed) return;
    if (await onSave(form.value)) onClose();
  };

  return (
    <form ref={container} className="space-y-3" onSubmit={submit} noValidate>
      <PhoneFields
        booking={booking}
        form={form}
        busy={busy}
        title="Telefono"
        inputRef={input}
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
          <SubmitLabel busy={busy} label="Salva" />
        </Button>
      </div>
    </form>
  );
}

/** Da telefono: un drawer annidato sopra la scheda (nested-drawer.tsx). */
export function PhoneDrawer({
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
  onSave: (phone: string) => Promise<boolean>;
  /** La riga che lo apre. */
  children: ReactNode;
}) {
  return (
    <NestedDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Telefono"
      description={`${booking.bookedBy} · ${dayLabel(dayKey(booking.bookingDate))}, ${timeRange(booking.bookingDate)}`}
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
  onSave: (phone: string) => Promise<boolean>;
}) {
  const form = usePhoneForm(booking);
  const close = useCloseNested();
  useNestedDirty(form.changed);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.changed) return;
    if (await onSave(form.value)) close();
  };

  return (
    <NestedDrawerForm
      onSubmit={submit}
      busy={busy}
      canSubmit={form.changed}
      submitLabel="Salva"
    >
      <PhoneFields booking={booking} form={form} busy={busy} />
    </NestedDrawerForm>
  );
}
