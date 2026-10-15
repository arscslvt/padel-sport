"use client";

import { RotateCw, Smartphone, X } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  type ClientOption,
  ClientSuggestions,
  LinkedClient,
  type PlayerLink,
  useClientMatches,
  useClients,
} from "./client-search";
import { type Booking, dayKey, dayLabel, timeRange } from "./lib";

/**
 * La squadra di una prenotazione, corretta dallo staff.
 *
 * Chi si è unito dall'app compare ma non si tocca: esce dalla partita
 * dall'app. Gli altri sono nomi da scrivere, con tanti posti vuoti quanti la
 * prenotazione ne ha ancora. Ogni nome si può collegare a un cliente in
 * anagrafica (client-search.tsx): la partita conta anche per lui nei punti. Le regole vere stanno in Convex
 * (bookings/players.ts): qui si aiuta solo a scrivere bene, prima di inviare.
 *
 * Due forme, perché la scheda ne ha due. Da desktop la scheda è una modale
 * alta abbastanza, e il modulo si apre dentro (`PlayersEditor`). Da telefono è
 * un drawer dal basso già pieno: il modulo finirebbe sotto il bordo, con la
 * tastiera sopra. Lì si apre un drawer annidato (`PlayersDrawer`).
 */

const NAME_MIN = 2;

interface EditData {
  /** Si sono uniti dall'app: si vedono, non si cambiano. */
  locked: string[];
  /** Il massimo di nomi per questa prenotazione. */
  seats: number;
  /** I nomi modificabili com'erano all'apertura: dicono se c'è da salvare. */
  original: string[];
  /** I collegamenti com'erano all'apertura, posto per posto. */
  originalLinks: (PlayerLink | null)[];
}

/** Ogni collegamento al primo nome uguale ancora libero. */
function linksFor(names: string[], links: PlayerLink[]): (PlayerLink | null)[] {
  const left = [...links];
  return names.map((name) => {
    const index = left.findIndex((link) => link.name === name);
    if (index === -1) return null;
    return left.splice(index, 1)[0];
  });
}

const linkKey = (links: (PlayerLink | null)[], names: string[]) =>
  names
    .map((name, index) =>
      name.trim() ? `${name.trim()}:${links[index]?.playerId ?? ""}` : "",
    )
    .filter(Boolean)
    .join("\u0000");

/** Toglie da `names` una occorrenza per ciascun nome di `remove`. */
function without(names: string[], remove: string[]): string[] {
  const rest = [...names];
  for (const name of remove) {
    const index = rest.indexOf(name);
    if (index !== -1) rest.splice(index, 1);
  }
  return rest;
}

const filledOf = (names: string[]) =>
  names.map((name) => name.trim()).filter(Boolean);

/** Il nome scritto non va: lo si dice accanto al campo, non in un avviso. */
function nameError(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length < NAME_MIN
    ? "Inserisci almeno due lettere."
    : null;
}

/** Legge i giocatori della prenotazione e tiene il modulo. */
function usePlayersForm(booking: Booking) {
  const [data, setData] = useState<EditData | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [linked, setLinked] = useState<(PlayerLink | null)[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  /** I campi lasciati almeno una volta: l'errore compare dopo, non a metà parola. */
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` serve a ricaricare con «Riprova».
  useEffect(() => {
    let alive = true;
    setLoadError(null);

    void (async () => {
      try {
        const response = await fetch(
          `/api/dashboard/bookings/players?bookingId=${encodeURIComponent(booking._id)}`,
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error);
        if (!alive) return;

        const locked: string[] = payload.locked;
        const editable = without(payload.players, locked);
        const slots = Math.max(editable.length, payload.seats - locked.length);
        // Chi è in partita dall'app è già fra i bloccati: qui restano i
        // collegamenti dei nomi scritti.
        const links = linksFor(
          editable,
          (payload.links ?? []).filter(
            (link: PlayerLink) => !locked.includes(link.name),
          ),
        );
        const blank = Array.from({ length: slots - editable.length }, () => "");

        setNames([...editable, ...blank]);
        setLinked([...links, ...blank.map(() => null)]);
        setData({
          locked,
          seats: payload.seats,
          original: editable,
          originalLinks: links,
        });
      } catch {
        if (alive) {
          setLoadError(
            "Impossibile caricare i giocatori. Controlla la connessione e riprova.",
          );
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [booking._id, attempt]);

  const setName = (index: number, value: string) => {
    setNames((current) =>
      current.map((name, position) => (position === index ? value : name)),
    );
    // Cambiato il nome, non è più quel cliente.
    setLinked((current) =>
      current.map((link, position) => (position === index ? null : link)),
    );
  };

  const pick = (index: number, option: ClientOption) => {
    setNames((current) =>
      current.map((name, position) =>
        position === index ? option.name : name,
      ),
    );
    setLinked((current) =>
      current.map((link, position) =>
        position === index ? { name: option.name, playerId: option.id } : link,
      ),
    );
  };

  const unlink = (index: number) =>
    setLinked((current) =>
      current.map((link, position) => (position === index ? null : link)),
    );

  const errors = names.map((name, index) =>
    submitted || visited.has(index) ? nameError(name) : null,
  );

  const filled = filledOf(names);
  const total = (data?.locked.length ?? 0) + filled.length;
  const dirty =
    data !== null &&
    (filled.join("\u0000") !== filledOf(data.original).join("\u0000") ||
      linkKey(linked, names) !== linkKey(data.originalLinks, data.original));
  /** Nessun nome in tutta la prenotazione: chi ha prenotato non può sparire. */
  const empty = submitted && data !== null && total === 0;

  /** I nomi da salvare, bloccati compresi, o `null` portando al campo da sistemare. */
  const collect = (): PlayersPayload | null => {
    if (!data) return null;
    setSubmitted(true);

    const firstInvalid = names.findIndex((name) => nameError(name) !== null);
    if (firstInvalid !== -1) {
      inputs.current[firstInvalid]?.focus();
      return null;
    }
    if (total === 0) {
      inputs.current[0]?.focus();
      return null;
    }

    return {
      players: [...data.locked, ...filled],
      links: names
        .map((name, index) => ({ name: name.trim(), link: linked[index] }))
        .filter(({ name, link }) => name && link)
        .map(({ name, link }) => ({ name, playerId: link?.playerId ?? "" })),
    };
  };

  return {
    data,
    names,
    linked,
    loadError,
    errors,
    empty,
    total,
    dirty,
    inputs,
    setName,
    pick,
    unlink,
    visit: (index: number) =>
      setVisited((current) => new Set(current).add(index)),
    retry: () => setAttempt((current) => current + 1),
    collect,
  };
}

type PlayersForm = ReturnType<typeof usePlayersForm>;

/** Quel che si salva: tutti i nomi in ordine, e quali sono clienti. */
export interface PlayersPayload {
  players: string[];
  links: { name: string; playerId: string }[];
}

function PlayersFields({
  form,
  title,
  busy,
  touch,
}: {
  form: PlayersForm;
  title?: string;
  busy: boolean;
  /** Da telefono: campi alti un pollice. */
  touch?: boolean;
}) {
  const { data, names, linked, loadError, errors, empty, total, inputs } = form;
  const id = useId();
  const clients = useClients();
  const [focused, setFocused] = useState<number | null>(null);
  const chosen = linked
    .map((link) => link?.playerId)
    .filter((playerId): playerId is string => Boolean(playerId));
  const matches = useClientMatches(
    clients,
    focused !== null && !linked[focused] ? (names[focused] ?? "") : "",
    chosen,
  );

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

  if (!data) {
    return (
      <ListGroup title={title}>
        <div aria-busy="true" className="space-y-3 p-4">
          <output className="sr-only">Caricamento dei giocatori…</output>
          <Skeleton className={cn("w-full", touch ? "h-11" : "h-9")} />
          <Skeleton className={cn("w-full", touch ? "h-11" : "h-9")} />
        </div>
      </ListGroup>
    );
  }

  const footer =
    data.locked.length > 0
      ? "Chi si è unito dall'app può uscire solo dall'app. Lascia vuoti i posti ancora liberi."
      : "Lascia vuoti i posti ancora liberi.";

  // Invio passa al campo dopo, come in un modulo da telefono; sull'ultimo salva.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== "Enter" || index === names.length - 1) return;
    event.preventDefault();
    inputs.current[index + 1]?.focus();
  };

  return (
    <div className="space-y-2">
      <ListGroup
        title={title}
        action={
          // Si aggiorna mentre si scrive, e lo legge anche lo screen reader.
          <span
            aria-live="polite"
            className="text-muted-foreground text-[13px] tabular-nums"
          >
            {total} di {data.seats} giocatori
          </span>
        }
        footer={footer}
      >
        {data.locked.map((name, index) => (
          <ListRow
            key={`locked-${index}-${name}`}
            leading={<Smartphone aria-hidden className="size-5" />}
            title={name}
            subtitle="Dall'app"
          />
        ))}

        {names.map((name, index) => {
          const position = data.locked.length + index + 1;
          const booker = data.locked.length === 0 && index === 0;
          const fieldId = `${id}-player-${index}`;
          const errorId = `${fieldId}-error`;
          const error =
            errors[index] ??
            (booker && empty ? "Inserisci il nome di chi prenota." : null);
          const link = linked[index];

          if (link) {
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: posti fissi, non si riordinano.
              <div key={index} className="px-4 py-3">
                <p className="mb-1.5 text-[13px] font-medium">
                  {booker ? "Prenotato da" : `Giocatore ${position}`}
                </p>
                <LinkedClient
                  name={name}
                  touch={touch}
                  onUnlink={
                    link.fixed || busy ? undefined : () => form.unlink(index)
                  }
                />
              </div>
            );
          }

          return (
            // La posizione è l'identità del campo: i nomi cambiano mentre si
            // scrive, e possono anche ripetersi.
            // biome-ignore lint/suspicious/noArrayIndexKey: posti fissi, non si riordinano.
            <div key={index} className="px-4 py-3">
              <label
                htmlFor={fieldId}
                className="mb-1.5 block text-[13px] font-medium"
              >
                {booker ? "Prenotato da" : `Giocatore ${position}`}
              </label>
              <div className="relative">
                <Input
                  id={fieldId}
                  ref={(element) => {
                    inputs.current[index] = element;
                  }}
                  value={name}
                  maxLength={60}
                  disabled={busy}
                  placeholder={booker ? "Nome e cognome" : "Posto libero"}
                  autoComplete="off"
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint={index === names.length - 1 ? "done" : "next"}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={cn("bg-card", touch ? "h-11 pr-11" : "h-9 pr-9")}
                  onChange={(event) => form.setName(index, event.target.value)}
                  onFocus={() => setFocused(index)}
                  onBlur={() => {
                    form.visit(index);
                    setFocused(null);
                  }}
                  onKeyDown={(event) => onKeyDown(event, index)}
                />
                {name && !busy && (
                  <button
                    type="button"
                    aria-label={`Cancella ${name.trim() || "il nome"}`}
                    className={cn(
                      "text-muted-foreground hover:text-foreground focus-visible:text-foreground absolute inset-y-0 right-0 flex items-center justify-center rounded-r-lg outline-none",
                      touch ? "w-11" : "w-9",
                    )}
                    onClick={() => {
                      form.setName(index, "");
                      inputs.current[index]?.focus();
                    }}
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                )}
              </div>
              {focused === index && (
                <ClientSuggestions
                  className="mt-1.5"
                  options={matches}
                  onPick={(option) => form.pick(index, option)}
                />
              )}
              {error && (
                <p id={errorId} className="text-danger mt-1.5 text-[13px]">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </ListGroup>
    </div>
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
  /** Tutti i nomi nell'ordine, bloccati compresi, e i clienti. Dice se è andata. */
  onSave: (payload: PlayersPayload) => Promise<boolean>;
  onClose: () => void;
}) {
  const form = usePlayersForm(booking);
  const container = useRef<HTMLFormElement>(null);
  const focused = useRef(false);

  // Aperto con un clic, il modulo deve farsi trovare: lo si porta in vista e
  // il fuoco va sul primo posto libero, o sul primo nome da correggere.
  useEffect(() => {
    if (!form.data || focused.current) return;
    focused.current = true;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    container.current?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });

    const firstEmpty = form.names.findIndex((name) => !name.trim());
    form.inputs.current[firstEmpty === -1 ? 0 : firstEmpty]?.focus({
      preventScroll: true,
    });
  }, [form.data, form.names, form.inputs]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = form.collect();
    if (payload && (await onSave(payload))) onClose();
  };

  return (
    <form ref={container} className="space-y-3" onSubmit={submit} noValidate>
      <PlayersFields form={form} title="Giocatori" busy={busy} />

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
        <Button type="submit" className={PRESS} disabled={busy || !form.dirty}>
          <SubmitLabel busy={busy} label="Salva" />
        </Button>
      </div>
    </form>
  );
}

/**
 * Da telefono: un drawer annidato sopra la scheda (nested-drawer.tsx).
 *
 * Il fuoco non va da solo in un campo: da telefono aprirebbe la tastiera sopra
 * il drawer prima ancora di averlo letto.
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
  onSave: (payload: PlayersPayload) => Promise<boolean>;
  /** La riga che lo apre. */
  children: ReactNode;
}) {
  return (
    <NestedDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Giocatori"
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
  onSave: (payload: PlayersPayload) => Promise<boolean>;
}) {
  const form = usePlayersForm(booking);
  const close = useCloseNested();
  useNestedDirty(form.dirty);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = form.collect();
    if (payload && (await onSave(payload))) close();
  };

  return (
    <NestedDrawerForm
      onSubmit={submit}
      busy={busy}
      canSubmit={form.dirty}
      submitLabel="Salva"
    >
      <PlayersFields form={form} busy={busy} touch />
    </NestedDrawerForm>
  );
}
