"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { windowsForDay } from "@padel-sport/backend/convex/modules/settings/schedule";
import { useQuery } from "convex/react";
import { Loader2, Phone } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SheetHeader } from "@/app/_components/sheet-header";
import { useConfirmLeave } from "@/app/_providers/confirm.provider";
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
import {
  type ClientOption,
  ClientOptionLabel,
  LinkedClient,
  useClientMatches,
  useClients,
} from "./client-search";
import { DayStrip } from "./day-strip";
import {
  type Booking,
  closedDay,
  LEVEL_LABELS,
  levelFromRating,
  nextDays,
  shortDayLabel,
} from "./lib";

/**
 * Una prenotazione presa dallo staff: chi chiama al telefono, chi passa allo
 * sportello.
 *
 * Un campo lo prende sempre un gruppo: il modulo chiede i quattro giocatori,
 * tutti uguali, non un prenotante e i suoi compagni. Ogni nome cerca fra i
 * clienti in anagrafica: collegato, la prenotazione compare anche sul sito e
 * nell'app di quel cliente e la partita gli conta nei punti automatici. Chi
 * non c'è resta un nome. Basta un giocatore; gli altri posti si riempiono
 * anche dopo, dalla scheda.
 *
 * Il telefono non si chiede: chi è in anagrafica ha già il suo numero nella
 * scheda. Solo per chi resta un nome si può lasciare un recapito, per poterlo
 * contattare.
 *
 * Sotto il dato resta quello di sempre: il primo nome scritto fa da
 * riferimento della prenotazione (`bookedBy`, e `createdByPlayer` se è un
 * cliente). Il suo numero — quello della scheda, o il recapito scritto qui —
 * è `phone`, a cui parte il WhatsApp di conferma; quello degli altri senza
 * scheda va in `guestContacts`. Se è un cliente porta anche il livello.
 *
 * Gli orari proposti sono quelli di apertura in cui c'è ancora un campo
 * libero, calcolati come sul sito; l'ultima parola resta del backend
 * (bookings/staffCreate.ts), che ricontrolla al momento di salvare.
 */

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
  // Con dati inseriti il drawer non si chiude per sbaglio: trascinarlo,
  // toccare fuori o «Annulla» chiedono prima «Uscire senza salvare?».
  const [dirty, setDirty] = useState(false);
  const confirmLeave = useConfirmLeave();

  const close = () => {
    setDirty(false);
    onOpenChange(false);
  };
  const requestClose = () => {
    if (dirty) void confirmLeave(close);
    else close();
  };

  return (
    <ResponsiveDrawer
      open={open}
      setOpen={(next) => (next ? onOpenChange(true) : close())}
      dirty={dirty}
      onCloseAttempt={requestClose}
    >
      <ResponsiveDrawerContent className="sm:max-w-lg md:max-h-[90dvh] md:overflow-y-auto">
        {open && (
          <Form
            initialDay={initialDay}
            onDirtyChange={setDirty}
            onCancel={requestClose}
            onCreated={(day) => {
              close();
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
  onDirtyChange,
  onCancel,
  onCreated,
}: {
  initialDay: string;
  /** Si è cominciato a inserire dati: orario, giocatori, recapiti. */
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
  onCreated: (day: string) => void;
}) {
  const days = useMemo(() => nextDays(DAYS_AHEAD), []);
  const [day, setDay] = useState(
    days.includes(initialDay) ? initialDay : days[0],
  );
  const [time, setTime] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string>("auto");

  const [seats, setSeats] = useState<Seat[]>(() =>
    Array.from({ length: MAX_PLAYERS }, () => ({ name: "" })),
  );
  const [level, setLevel] = useState<Booking["level"]>("intermedio");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  // Il livello e la spunta dell'avviso hanno già un valore: cambiarli da soli
  // non è «aver cominciato». Lo è scegliere un orario o scrivere qualcosa.
  const dirty =
    time !== null ||
    seats.some(
      (seat) => seat.name.trim() !== "" || Boolean(seat.phone?.trim()),
    );
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // I posti scritti, nell'ordine: i vuoti in mezzo non contano.
  const filled = seats
    .map((seat) => ({ ...seat, name: seat.name.trim() }))
    .filter((seat) => seat.name !== "");

  // L'anagrafica, per collegare i giocatori a un cliente.
  const clients = useClients();
  const chosenIds = useMemo(
    () =>
      seats
        .map((seat) => seat.client?.id)
        .filter((id): id is string => Boolean(id)),
    [seats],
  );

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
    // Un giorno chiuso (per date o spento) non ha fasce.
    const slots = availableSlots(
      date,
      windowsForDay(
        settings ?? { windows: DEFAULT_WINDOWS },
        day,
        date.getDay(),
      ),
    );
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
  }, [day, settings, availability, courts]);

  const closedDays = useMemo(
    () => new Set(days.filter((key) => closedDay(settings, key))),
    [days, settings],
  );

  const chosen = times.find((slot) => slot.time === time);
  const loadingTimes = availability === undefined || courts === undefined;

  // Cambiato il giorno, l'ora scelta potrebbe non esserci più.
  // biome-ignore lint/correctness/useExhaustiveDependencies: si azzera al cambio di giorno.
  useEffect(() => {
    setTime(null);
    setSlotId("auto");
  }, [day]);

  const changeSeat = (index: number, next: Seat) => {
    setSeats((current) =>
      current.map((row, position) => (position === index ? next : row)),
    );

    // Il primo posto, se è un cliente, porta il suo livello.
    if (index === 0 && next.client) {
      setLevel(levelFromRating(next.client.level));
    }
  };

  const canSave = (filled[0]?.name.length ?? 0) >= 2 && chosen?.ok && !saving;

  const save = async () => {
    const [first, ...rest] = filled;
    if (!chosen || !time || !first) return;
    setSaving(true);
    try {
      const response = await fetch("/api/dashboard/bookings/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingDate: combineDateAndTime(new Date(`${day}T00:00:00`), time),
          slotId: slotId === "auto" ? undefined : slotId,
          playerId: first.client?.id,
          bookedBy: first.name,
          // Un cliente ha il numero nella scheda: lo prende il backend.
          phone: first.client ? undefined : contactOf(first),
          players: filled.map((seat) => seat.name),
          linkedPlayerIds: rest
            .map((seat) => seat.client?.id)
            .filter((id): id is string => Boolean(id)),
          guestContacts: rest.flatMap((seat) => {
            const phone = seat.client ? undefined : contactOf(seat);
            return phone ? [{ name: seat.name, phone }] : [];
          }),
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
        description: `${shortDayLabel(day)} alle ${time}. Codice ${payload?.code ?? ""}.`,
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
      <SheetHeader title="Nuova prenotazione" />

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pt-1 pb-2 md:-mx-1 md:px-1">
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium">Giocatori</h3>
            {/* Si aggiorna mentre si scrive, e lo legge anche lo screen reader. */}
            <span
              aria-live="polite"
              className="text-muted-foreground text-[13px] tabular-nums"
            >
              {filled.length} di {MAX_PLAYERS}
            </span>
          </div>
          <div className="space-y-3">
            {seats.map((seat, index) => (
              <PlayerSeat
                // biome-ignore lint/suspicious/noArrayIndexKey: i quattro posti sono fissi.
                key={index}
                index={index}
                value={seat}
                clients={clients}
                exclude={chosenIds}
                onChange={(next) => changeSeat(index, next)}
              />
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Scrivendo, scegli il cliente dall&apos;anagrafica: il numero lo
            prende dalla sua scheda, e la partita gli conta nei punti. Se non
            c&apos;è, usa solo il nome e lascia un recapito. Lascia vuoti i
            posti ancora liberi.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Quando</h3>
          <DayStrip
            days={days}
            selected={day}
            onSelect={setDay}
            marks={new Map()}
            closed={closedDays}
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
                      ? "bg-primary text-primary-foreground border-primary"
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
                          ? "bg-primary text-primary-foreground border-primary"
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

        <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="new-booking-notify">Avvisa i giocatori</Label>
            <p className="text-muted-foreground text-xs">
              Mail con il QR e WhatsApp a chi ha i recapiti.
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

interface Seat {
  name: string;
  client?: ClientOption;
  /** Il recapito di chi non è in anagrafica. */
  phone?: string;
}

function contactOf(seat: Seat): string | undefined {
  return seat.phone?.trim() || undefined;
}

/**
 * Un giocatore: si cerca in anagrafica, o resta un nome.
 *
 * Il posto è un blocco solo, come una casella con la sua tendina: sotto il
 * nome, dentro la stessa cornice, i clienti che gli somigliano e in fondo
 * «Usa solo il nome». Il recapito compare solo per un nome libero: quando
 * nessun cliente somiglia, quando si sceglie «Usa solo il nome», o quando si
 * lascia il campo senza sceglierne uno. Finché c'è un cliente da scegliere,
 * il telefono non si mette in mezzo: chi è in anagrafica ha già il suo.
 *
 * Da tastiera le frecce scorrono l'elenco e Invio sceglie.
 */
function PlayerSeat({
  index,
  value,
  clients,
  exclude,
  onChange,
}: {
  index: number;
  value: Seat;
  clients: ClientOption[];
  exclude: string[];
  onChange: (next: Seat) => void;
}) {
  const listId = useId();
  const phoneInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = useClientMatches(
    clients,
    open && !value.client ? value.name : "",
    exclude,
  );

  if (value.client) {
    return (
      <LinkedClient
        name={value.client.name}
        touch
        onUnlink={() => onChange({ name: "" })}
      />
    );
  }

  const name = value.name.trim();
  const listed = open && matches.length > 0;
  // I clienti, poi «Usa solo il nome».
  const rows = listed ? matches.length + 1 : 0;
  const current = active < rows ? active : -1;
  const showPhone =
    name !== "" &&
    (Boolean(value.phone?.trim()) ||
      !open ||
      (name.length >= 2 && matches.length === 0));

  const close = () => {
    setOpen(false);
    setActive(-1);
  };
  const pick = (option: ClientOption) => {
    close();
    onChange({ name: option.name, client: option });
  };
  // Il nome resta libero: si passa subito al recapito.
  const keepName = () => {
    close();
    requestAnimationFrame(() => phoneInput.current?.focus());
  };
  const choose = (row: number) =>
    row < matches.length ? pick(matches[row]) : keepName();

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!listed) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current + 1) % rows);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(current <= 0 ? rows - 1 : current - 1);
    } else if (event.key === "Enter" && current >= 0) {
      event.preventDefault();
      choose(current);
    }
  };

  const rowId = (row: number) => `${listId}-${row}`;
  const rowClass = (row: number) =>
    cn(
      "flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 transition-colors md:hover:bg-muted/50",
      current === row && "bg-muted md:hover:bg-muted",
    );

  return (
    // Nome, tendina e recapito sono un blocco solo: la cornice li tiene
    // insieme e si accende tutta, ovunque sia il cursore.
    <div className="bg-card border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 overflow-hidden rounded-xl border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
      <Input
        value={value.name}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={listed}
        aria-controls={listed ? listId : undefined}
        aria-activedescendant={current >= 0 ? rowId(current) : undefined}
        aria-label={`Giocatore ${index + 1}`}
        placeholder={
          index === 0
            ? "Nome e cognome, o cerca un cliente"
            : `Giocatore ${index + 1}`
        }
        className={SEAT_INPUT}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          setOpen(true);
          setActive(-1);
          onChange({ ...value, name: event.target.value });
        }}
      />

      {listed && (
        <div
          id={listId}
          role="listbox"
          aria-label="Clienti in anagrafica"
          className="border-border/70 border-t py-1"
        >
          {matches.map((option, row) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: la tastiera passa dalla casella (aria-activedescendant).
            <div
              key={option.id}
              id={rowId(row)}
              role="option"
              tabIndex={-1}
              aria-selected={current === row}
              // Prima del blur della casella: altrimenti il tocco chiude
              // l'elenco prima di arrivare alla riga.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(option)}
              className={rowClass(row)}
            >
              <ClientOptionLabel option={option} />
            </div>
          ))}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: la tastiera passa dalla casella (aria-activedescendant). */}
          <div
            id={rowId(matches.length)}
            role="option"
            tabIndex={-1}
            aria-selected={current === matches.length}
            onMouseDown={(event) => event.preventDefault()}
            onClick={keepName}
            className={cn(
              rowClass(matches.length),
              "border-border/70 mt-1 justify-start border-t",
            )}
          >
            <span className="min-w-0 py-1.5">
              <span className="block truncate text-[15px]">
                Usa solo il nome «{name}»
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                Non è in anagrafica
              </span>
            </span>
          </div>
        </div>
      )}

      {showPhone && (
        <div className="border-border/70 ml-3 flex items-center gap-2 border-t">
          <Phone
            aria-hidden
            className="text-muted-foreground size-4 shrink-0"
          />
          <Input
            ref={phoneInput}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={value.phone ?? ""}
            aria-label={`Recapito di ${name}`}
            placeholder={
              index === 0
                ? "Telefono per la conferma (facoltativo)"
                : "Telefono per contattarlo (facoltativo)"
            }
            className={cn(SEAT_INPUT, "h-10 pl-1")}
            onChange={(event) =>
              onChange({ ...value, phone: event.target.value })
            }
          />
        </div>
      )}
    </div>
  );
}

/** Gli input dentro la cornice del posto: il bordo e l'anello sono suoi. */
const SEAT_INPUT =
  "h-11 rounded-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0 dark:bg-transparent";
