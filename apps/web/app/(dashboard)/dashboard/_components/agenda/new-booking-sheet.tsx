"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SheetHeader } from "@/app/(dashboard)/_components/sheet-header";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
} from "@/components/ui/responsive-drawer";
import { Switch } from "@/components/ui/switch";
import {
  availableSlots,
  combineDateAndTime,
  DEFAULT_WINDOWS,
  MAX_PLAYERS,
  overlappingBlocks,
  overlappingBookings,
} from "@/lib/booking";
import { cn } from "@/lib/utils";

import { DayStrip } from "./day-strip";
import {
  type Booking,
  LEVEL_LABELS,
  levelFromRating,
  nextDays,
  shortDayLabel,
} from "./lib";

/**
 * Una prenotazione presa dallo staff: chi chiama al telefono, chi passa allo
 * sportello.
 *
 * Il modulo segue l'ordine della telefonata: chi sei, quando vuoi giocare, su
 * che campo, con chi. Il nome cerca fra i clienti in anagrafica e, se lo
 * trova, si porta dietro telefono e livello: la prenotazione resta legata a
 * quella persona e la ritrova sul sito e nell'app. Se non c'è, basta il nome.
 *
 * Gli orari proposti sono quelli di apertura in cui c'è ancora un campo
 * libero, calcolati come sul sito; l'ultima parola resta del backend
 * (bookings/staffCreate.ts), che ricontrolla al momento di salvare.
 */

interface ClientOption {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  level: number;
}

const DAYS_AHEAD = 30;
const LEVELS = Object.keys(LEVEL_LABELS) as Booking["level"][];

export function NewBookingSheet({
  open,
  onOpenChange,
  initialDay,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Il giorno aperto in agenda: è quasi sempre quello che si vuole. */
  initialDay: string;
  onCreated: (day: string) => void;
}) {
  return (
    <ResponsiveDrawer open={open} setOpen={onOpenChange}>
      <ResponsiveDrawerContent className="sm:max-w-lg md:max-h-[90dvh] md:overflow-y-auto">
        {open && (
          <Form
            initialDay={initialDay}
            onCancel={() => onOpenChange(false)}
            onCreated={(day) => {
              onOpenChange(false);
              onCreated(day);
            }}
          />
        )}
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}

function Form({
  initialDay,
  onCancel,
  onCreated,
}: {
  initialDay: string;
  onCancel: () => void;
  onCreated: (day: string) => void;
}) {
  const days = useMemo(() => nextDays(DAYS_AHEAD), []);
  const [day, setDay] = useState(
    days.includes(initialDay) ? initialDay : days[0],
  );
  const [time, setTime] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string>("auto");

  const [client, setClient] = useState<ClientOption | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [others, setOthers] = useState(["", "", ""]);
  const [level, setLevel] = useState<Booking["level"]>("intermedio");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  // L'anagrafica, per collegare la prenotazione a un cliente. Si chiede una
  // volta all'apertura: sono poche centinaia di righe e si filtra qui.
  const [clients, setClients] = useState<ClientOption[]>([]);
  useEffect(() => {
    fetch("/api/dashboard/clients")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setClients(payload?.clients ?? []))
      .catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    const needle = name.trim().toLowerCase();
    if (client || needle.length < 2) return [];
    return clients
      .filter(
        (row) =>
          row.name.toLowerCase().includes(needle) ||
          row.phone?.replace(/\s/g, "").includes(needle.replace(/\s/g, "")),
      )
      .slice(0, 5);
  }, [clients, client, name]);

  // Gli orari liberi del giorno scelto: stesse finestre e stessa regola del sito.
  const settings = useQuery(api.modules.settings.booking.get, {});
  const courts = useQuery(api.slots.listActive.default);
  const range = useMemo(() => {
    const from = new Date(`${day}T00:00:00`).getTime();
    return { from, to: from + 24 * 60 * 60 * 1000 - 1 };
  }, [day]);
  const availability = useQuery(api.bookings.availability.default, range);

  const times = useMemo(() => {
    const date = new Date(`${day}T00:00:00`);
    const slots = availableSlots(date, settings?.windows ?? DEFAULT_WINDOWS);
    if (!availability || !courts) {
      return slots.map((slot) => ({
        ...slot,
        free: [] as string[],
        ok: false,
      }));
    }

    return slots.map((slot) => {
      const start = combineDateAndTime(date, slot.time);
      const overlapping = overlappingBookings(availability.busy, start);
      const blocked = overlappingBlocks(availability.blocks, start).length;
      // Una prenotazione senza campo (righe vecchie) li occupa tutti.
      const free = overlapping.some((row) => !row.slot)
        ? []
        : courts
            .filter(
              (court) => !overlapping.some((row) => row.slot === court._id),
            )
            .map((court) => court._id as string);
      return { ...slot, free, ok: free.length - blocked > 0 };
    });
  }, [day, settings?.windows, availability, courts]);

  const chosen = times.find((slot) => slot.time === time);
  const loadingTimes = availability === undefined || courts === undefined;

  // Cambiato il giorno, l'ora scelta potrebbe non esserci più.
  // biome-ignore lint/correctness/useExhaustiveDependencies: si azzera al cambio di giorno.
  useEffect(() => {
    setTime(null);
    setSlotId("auto");
  }, [day]);

  const pickClient = (option: ClientOption) => {
    setClient(option);
    setName(option.name);
    setPhone(option.phone ?? "");
    setLevel(levelFromRating(option.level));
  };

  const canSave = name.trim().length >= 2 && chosen?.ok && !saving;

  const save = async () => {
    if (!chosen || !time) return;
    setSaving(true);
    try {
      const response = await fetch("/api/dashboard/bookings/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingDate: combineDateAndTime(new Date(`${day}T00:00:00`), time),
          slotId: slotId === "auto" ? undefined : slotId,
          playerId: client?.id,
          bookedBy: name.trim(),
          phone: phone.trim() || undefined,
          players: [name.trim(), ...others.map((other) => other.trim())].filter(
            Boolean,
          ),
          level,
          notify,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Prenotazione non creata", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Prenotazione creata", {
        description: `${name.trim()}, ${shortDayLabel(day)} alle ${time}. Codice ${payload?.code ?? ""}.`,
      });
      onCreated(day);
    } catch {
      toast.error("Prenotazione non creata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SheetHeader
        title="Nuova prenotazione"
        description="Nasce già confermata: la prendi tu per conto del club."
      />

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-2 md:px-0">
        <Field label="Chi prenota" htmlFor="new-booking-name">
          {client ? (
            <div className="bg-muted/50 flex min-h-12 items-center gap-3 rounded-xl border px-3">
              <UserRound className="text-muted-foreground size-5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">
                  {client.name}
                </span>
                <span className="text-muted-foreground block text-xs">
                  Cliente in anagrafica
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                aria-label="Scollega il cliente"
                onClick={() => {
                  setClient(null);
                  setName("");
                  setPhone("");
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Input
                id="new-booking-name"
                value={name}
                autoComplete="off"
                placeholder="Nome e cognome, o cerca un cliente"
                className="bg-card h-12 rounded-xl text-base"
                onChange={(event) => setName(event.target.value)}
              />
              {suggestions.length > 0 && (
                <ul className="bg-card overflow-hidden rounded-xl border [&>*+*]:border-t">
                  {suggestions.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => pickClient(option)}
                        className="active:bg-muted/80 md:hover:bg-muted/50 flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left"
                      >
                        <span className="truncate text-[15px]">
                          {option.name}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {option.phone ?? "Cliente"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Field>

        <Field label="Telefono" htmlFor="new-booking-phone">
          <Input
            id="new-booking-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            placeholder="Per la conferma su WhatsApp"
            className="bg-card h-12 rounded-xl text-base"
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Quando</h3>
          <DayStrip
            days={days}
            selected={day}
            onSelect={setDay}
            marks={new Map()}
          />
          {loadingTimes ? (
            <div className="text-muted-foreground flex h-12 items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Controllo i campi liberi
            </div>
          ) : times.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Il club è chiuso in questo giorno, o gli orari sono passati.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {times.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.ok}
                  aria-pressed={time === slot.time}
                  onClick={() => {
                    setTime(slot.time);
                    setSlotId("auto");
                  }}
                  className={cn(
                    "h-11 rounded-xl border text-[15px] tabular-nums transition-[background-color,transform] active:scale-95 disabled:pointer-events-none disabled:line-through disabled:opacity-35",
                    time === slot.time
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card",
                  )}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </section>

        {chosen?.ok && courts && (
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Campo</h3>
            <div className="flex flex-wrap gap-2">
              {[{ _id: "auto", name: "Il primo libero" }, ...courts].map(
                (court) => {
                  const free =
                    court._id === "auto" || chosen.free.includes(court._id);
                  return (
                    <button
                      key={court._id}
                      type="button"
                      disabled={!free}
                      aria-pressed={slotId === court._id}
                      onClick={() => setSlotId(court._id)}
                      className={cn(
                        "h-10 rounded-full border px-4 text-sm transition-[background-color,transform] active:scale-95 disabled:pointer-events-none disabled:opacity-35",
                        slotId === court._id
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card",
                      )}
                    >
                      {court.name}
                    </button>
                  );
                },
              )}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Livello</h3>
          <fieldset className="bg-muted grid grid-cols-3 gap-1 rounded-xl p-1">
            <legend className="sr-only">Livello</legend>
            {LEVELS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={level === value}
                onClick={() => setLevel(value)}
                className={cn(
                  "min-h-10 rounded-lg text-sm transition-colors",
                  level === value
                    ? "bg-background font-medium shadow-xs"
                    : "text-muted-foreground",
                )}
              >
                {LEVEL_LABELS[value]}
              </button>
            ))}
          </fieldset>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">
            Altri giocatori{" "}
            <span className="text-muted-foreground font-normal">
              (facoltativi)
            </span>
          </h3>
          <div className="space-y-2">
            {others.map((value, index) => (
              <Input
                // biome-ignore lint/suspicious/noArrayIndexKey: i tre posti sono fissi.
                key={index}
                value={value}
                aria-label={`Giocatore ${index + 2}`}
                placeholder={`Giocatore ${index + 2} di ${MAX_PLAYERS}`}
                className="bg-card h-11 rounded-xl text-base"
                onChange={(event) =>
                  setOthers((current) =>
                    current.map((other, position) =>
                      position === index ? event.target.value : other,
                    ),
                  )
                }
              />
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="new-booking-notify">Avvisa il cliente</Label>
            <p className="text-muted-foreground text-xs">
              Mail con il QR e WhatsApp, se ci sono i recapiti.
            </p>
          </div>
          <Switch
            id="new-booking-notify"
            checked={notify}
            onCheckedChange={setNotify}
          />
        </div>
      </div>

      <ResponsiveDrawerFooter className="flex flex-col-reverse gap-2 border-t pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:flex-row md:justify-end md:border-t-0 md:pb-0">
        <Button variant="ghost" className="h-12 md:h-9" onClick={onCancel}>
          Annulla
        </Button>
        <Button
          className="h-12 rounded-xl md:h-9"
          disabled={!canSave}
          onClick={() => void save()}
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {time
            ? `Prenota ${shortDayLabel(day).toLowerCase()} alle ${time}`
            : "Scegli un orario"}
        </Button>
      </ResponsiveDrawerFooter>
    </>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}
