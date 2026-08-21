"use client";

import type { api } from "@padel-sport/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { CalendarClock, CalendarOff, Search, UserPlus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/(dashboard)/_components/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { flattenForms, initialFormId } from "@/lib/event-forms";
import { searchRsvps } from "@/lib/event-rsvp";
import { formatEventDate } from "@/lib/events";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { EventWithRsvpForms } from "@/sanity/types";

/**
 * La lista arrivi: l'appello che si fa all'ingresso, la sera dell'evento.
 *
 * Non è l'elenco iscritti con una casella in più. Lì si gestiscono le
 * iscrizioni — chi c'è, chi si è disiscritto, chi va tolto; qui si guarda in
 * faccia una persona e si dice «sei arrivata». Per questo non c'è nessun
 * cestino: alla cassa, con la fila che aspetta, un tasto che cancella
 * un'iscrizione accanto a uno che la spunta è un incidente in attesa.
 *
 * Gli accompagnatori non hanno un nome in banca dati — il modulo pubblico
 * chiede solo quanti sono — quindi si numerano: «Ospite 1», «Ospite 2». Sono
 * segnaposto di conteggio, e vanno spuntati uno per uno perché possono arrivare
 * in momenti diversi da chi li ha iscritti.
 */

type RsvpEntry = FunctionReturnType<
  typeof api.modules.eventRsvps.list.default
>[number];

/** Quante persone porta un'iscrizione, e quante ne sono già entrate. */
function tally(entry: RsvpEntry) {
  return {
    total: entry.guests + 1,
    arrived: (entry.checkedInAt ? 1 : 0) + entry.checkedInGuests.length,
  };
}

/**
 * Gli accompagnatori come righe da spuntare.
 *
 * L'indice è la loro identità — sono posti numerati, non persone, e nessuno li
 * riordina mai — ma da solo non basta come `key`: due iscrizioni diverse
 * avrebbero entrambe uno «0». La chiave lo qualifica con l'iscrizione che li
 * porta, così resta unica in tutta la pagina.
 */
function guestSlots(entry: RsvpEntry) {
  return Array.from({ length: entry.guests }, (_, index) => ({
    key: `${entry.id}:${index}`,
    index,
    label: `Ospite ${index + 1}`,
    arrived: entry.checkedInGuests.includes(index),
  }));
}

/**
 * Il nome con la riga che lo cancella.
 *
 * La linea si disegna da sinistra invece di comparire tutta insieme: è il gesto
 * del pennarello sulla lista di carta, e dice «fatto» meglio di un colore che
 * cambia. `initial={false}` è quel che tiene la cosa sobria al caricamento —
 * chi ricarica la pagina a metà serata trova le righe già barrate, ferme, non
 * venti linee che partono insieme.
 */
function StruckText({
  children,
  struck,
  className,
}: {
  children: React.ReactNode;
  struck: boolean;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <span className={cn("relative inline-block", className)}>
      {children}
      <motion.span
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-[1.5px] origin-left rounded-full bg-current"
        initial={false}
        animate={{ scaleX: struck ? 1 : 0 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: DURATION.fast, ease: EASE }
        }
      />
    </span>
  );
}

/**
 * Una persona da spuntare: l'iscritto o un suo accompagnatore.
 *
 * Tutta la riga è l'etichetta della casella, non solo il quadratino: si usa col
 * dito, in piedi, con qualcuno che aspetta dall'altra parte del banco.
 */
function PersonRow({
  label,
  sublabel,
  checked,
  onToggle,
}: {
  label: string;
  sublabel?: React.ReactNode;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-opacity hover:bg-muted/50",
        checked && "opacity-55",
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onToggle(value === true)}
        className="size-5"
      />
      <span className="min-w-0 flex-1">
        <StruckText struck={checked} className="font-medium">
          {label}
        </StruckText>
        {sublabel && (
          <span className="block truncate text-xs text-muted-foreground">
            {sublabel}
          </span>
        )}
      </span>
    </label>
  );
}

function ListSkeleton() {
  const rows = ["row-a", "row-b", "row-c", "row-d"] as const;

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Skeleton key={row} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function Arrivals({ events }: { events: EventWithRsvpForms[] }) {
  const forms = useMemo(() => flattenForms(events), [events]);
  const shouldReduceMotion = useReducedMotion();

  /** Stesso `?form=` della pagina eventi: il tasto «Registra arrivi» lo porta. */
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState(() =>
    initialFormId(forms, searchParams.get("form")),
  );

  const selected = forms.find((form) => form.id === selectedId) ?? forms[0];

  const [entries, setEntries] = useState<RsvpEntry[] | undefined>(undefined);
  const [query, setQuery] = useState("");

  const loadEntries = useCallback(async () => {
    if (!selected) {
      setEntries([]);
      return;
    }

    setEntries(undefined);

    try {
      const response = await fetch(
        `/api/dashboard/events/rsvps?eventId=${encodeURIComponent(selected.eventId)}&key=${encodeURIComponent(selected.blockKey)}`,
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Iscrizioni non caricate", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        setEntries([]);
        return;
      }

      setEntries(payload.entries ?? []);
    } catch {
      toast.error("Iscrizioni non caricate", {
        description: "Controlla la connessione e riprova.",
      });
      setEntries([]);
    }
  }, [selected]);

  useEffect(() => {
    void loadEntries();
    setQuery("");
  }, [loadEntries]);

  /**
   * La spunta si vede subito e si salva dopo.
   *
   * Alla cassa la rete è quella che è, e aspettare il server prima di muovere
   * la casella vorrebbe dire spuntare due volte lo stesso nome perché «non ha
   * fatto niente». Se il salvataggio fallisce la riga torna indietro e lo dice:
   * l'unica cosa peggiore di una spunta lenta è una spunta che non c'è.
   */
  const toggle = async (
    entry: RsvpEntry,
    guestIndex: number | undefined,
    arrived: boolean,
  ) => {
    const apply = (list: RsvpEntry[], value: boolean) =>
      list.map((row) => {
        if (row.id !== entry.id) return row;

        if (guestIndex === undefined) {
          return { ...row, checkedInAt: value ? Date.now() : undefined };
        }

        const guests = new Set(row.checkedInGuests);
        if (value) {
          guests.add(guestIndex);
        } else {
          guests.delete(guestIndex);
        }

        return { ...row, checkedInGuests: [...guests].sort((a, b) => a - b) };
      });

    setEntries((current) => (current ? apply(current, arrived) : current));

    try {
      const response = await fetch("/api/dashboard/events/rsvps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, guestIndex, arrived }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) throw new Error(payload?.error ?? undefined);

      // Il server ha l'ultima parola: se qualcun altro ha spuntato la stessa
      // persona da un altro telefono, quel che vale è quello che è in banca dati.
      const saved = payload?.entry;
      if (saved) {
        setEntries((current) =>
          current?.map((row) =>
            row.id === entry.id
              ? {
                  ...row,
                  checkedInAt: saved.checkedInAt,
                  checkedInGuests: saved.checkedInGuests ?? [],
                }
              : row,
          ),
        );
      }
    } catch (error) {
      setEntries((current) => (current ? apply(current, !arrived) : current));
      toast.error("Arrivo non registrato", {
        description:
          error instanceof Error && error.message
            ? error.message
            : "Controlla la connessione e riprova.",
      });
    }
  };

  if (!forms.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarOff />
          </EmptyMedia>
          <EmptyTitle>Nessun modulo di iscrizione</EmptyTitle>
          <EmptyDescription>
            Nessun evento pubblicato contiene un modulo di iscrizione: non c'è
            nessuna lista da spuntare.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const expected =
    entries?.reduce((total, entry) => total + tally(entry).total, 0) ?? 0;
  const arrived =
    entries?.reduce((total, entry) => total + tally(entry).arrived, 0) ?? 0;
  const percent = expected > 0 ? Math.round((arrived / expected) * 100) : 0;

  /**
   * Il filtro tocca solo l'elenco. La barra in cima continua a contare tutti:
   * dice quanta gente è entrata stasera, e cercare un nome non fa arrivare né
   * sparire nessuno.
   */
  const visible = entries ? searchRsvps(entries, query) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Evento</span>
        <Select value={selected?.id} onValueChange={setSelectedId}>
          <SelectTrigger className="w-full bg-white md:w-[28rem]">
            <SelectValue placeholder="Scegli un evento" />
          </SelectTrigger>
          <SelectContent>
            {forms.map((form) => (
              <SelectItem key={form.id} value={form.id}>
                {form.eventTitle}
                {form.showsHeading && form.heading ? ` — ${form.heading}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4" />
              {formatEventDate(selected.dateStart, selected.dateEnd)}
            </span>
          </div>

          <Card>
            <CardHeader>
              <CardDescription>Arrivati</CardDescription>
              <CardTitle className="text-3xl">
                {entries === undefined ? "—" : `${arrived} / ${expected}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Persone arrivate"
                aria-valuemin={0}
                aria-valuemax={expected}
                aria-valuenow={arrived}
              >
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: `${percent}%` }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { duration: DURATION.base, ease: EASE }
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Iscritti e accompagnatori. Le spunte si salvano da sole.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chi è atteso</CardTitle>
              <CardDescription>
                In ordine di iscrizione. Chi è già entrato resta al suo posto,
                barrato, così un nome si ritrova sempre dove lo si era lasciato.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {entries !== undefined && entries.length > 0 && (
                <div>
                  {/*
                   * `relative` sta stretto attorno al solo campo: il contatore
                   * qui sotto cresce e cala, e se stesse dentro sposterebbe il
                   * centro rispetto a cui l'icona si posiziona — che scenderebbe
                   * appena si comincia a scrivere.
                   */}
                  <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      placeholder="Cerca per nome o email…"
                      className="h-11 bg-white pl-9"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </div>
                  {query.trim() && visible && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {visible.length} di {entries.length} iscritti · la barra
                      qui sopra conta comunque tutti
                    </p>
                  )}
                </div>
              )}

              {entries === undefined || visible === undefined ? (
                <ListSkeleton />
              ) : entries.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UserPlus />
                    </EmptyMedia>
                    <EmptyTitle>Nessuna iscrizione</EmptyTitle>
                    <EmptyDescription>
                      A questo modulo non si è iscritto nessuno: stasera non c'è
                      niente da spuntare.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : visible.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Search />
                    </EmptyMedia>
                    <EmptyTitle>Nessuno con questo nome</EmptyTitle>
                    <EmptyDescription>
                      Fra i {entries.length} attesi non c'è nessuno che risponda
                      a «{query.trim()}». Se si presenta comunque, va iscritto
                      prima dall'elenco dell'evento.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ul className="divide-y">
                  {visible.map((entry) => {
                    const counts = tally(entry);

                    return (
                      <li key={entry.id} className="py-2 first:pt-0 last:pb-0">
                        <PersonRow
                          label={entry.name}
                          sublabel={entry.email}
                          checked={Boolean(entry.checkedInAt)}
                          onToggle={(value) =>
                            void toggle(entry, undefined, value)
                          }
                        />

                        {entry.guests > 0 && (
                          <div className="mt-1 ml-4 border-l pl-3">
                            <p className="px-2 pb-1 text-xs text-muted-foreground">
                              {counts.arrived} di {counts.total} arrivati
                            </p>
                            <ul>
                              {guestSlots(entry).map((slot) => (
                                <li key={slot.key}>
                                  <PersonRow
                                    label={slot.label}
                                    checked={slot.arrived}
                                    onToggle={(value) =>
                                      void toggle(entry, slot.index, value)
                                    }
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
