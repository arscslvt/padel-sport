"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarClock,
  CalendarOff,
  ClipboardCheck,
  MailX,
  Search,
  Trash,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/(dashboard)/_components/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type FormRow, flattenForms, initialFormId } from "@/lib/event-forms";
import {
  isCheckInOpen,
  isRsvpClosed,
  searchRsvps,
  seatsLabel,
} from "@/lib/event-rsvp";
import { formatEventDate } from "@/lib/events";
import type { EventWithRsvpForms } from "@/sanity/types";
import { GuestsDialog, NewRsvpDialog } from "./rsvp-editor";

/**
 * Ogni minuto, l'ora corrente.
 *
 * Scadenza delle iscrizioni e apertura della cassa sono confronti con «adesso»:
 * calcolati una volta al montaggio resterebbero fermi, e la sera dell'evento la
 * dashboard sta aperta per ore. Un minuto è il passo giusto — la precisione che
 * serve è quella dell'orologio a muro, non del cronometro.
 */
function useMinuteTick() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return now;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="text-sm text-muted-foreground">
          {hint}
        </CardContent>
      )}
    </Card>
  );
}

function ListSkeleton() {
  const rows = ["row-a", "row-b", "row-c"] as const;

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Skeleton key={row} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

/** Una riga dell'elenco iscritti, così come la restituisce Convex. */
type RsvpEntry = FunctionReturnType<
  typeof api.modules.eventRsvps.list.default
>[number];

export default function Participations({
  events,
}: {
  events: EventWithRsvpForms[];
}) {
  const forms = useMemo(() => flattenForms(events), [events]);

  /**
   * `?form=` sceglie il modulo da mostrare: è dove atterra chi tocca l'avviso
   * di una nuova iscrizione, e da dove torna chi arriva dalla lista arrivi.
   */
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState(() =>
    initialFormId(forms, searchParams.get("form")),
  );

  const selected = forms.find((form) => form.id === selectedId) ?? forms[0];
  const now = useMinuteTick();
  const [query, setQuery] = useState("");

  const counts = useQuery(
    api.modules.eventRsvps.statsBatch.default,
    forms.length
      ? {
          forms: forms.map((form) => ({
            eventId: form.eventId,
            blockKey: form.blockKey,
          })),
        }
      : "skip",
  );

  /**
   * Nomi e indirizzi degli iscritti arrivano da una route staff, non da
   * `useQuery`: sono dati di persone, e il deployment Convex ha un URL
   * pubblico. Il conteggio qui sopra resta in diretta perché sono soli numeri,
   * già pubblici sulla pagina dell'evento.
   */
  const [entries, setEntries] = useState<RsvpEntry[] | undefined>(undefined);

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
    // Cambiando evento la ricerca di prima non vuol dire più niente, e lasciarla
    // lì farebbe sembrare vuoto un elenco che è solo filtrato.
    setQuery("");
  }, [loadEntries]);

  const cancelRsvp = async (id: string) => {
    const response = await fetch("/api/dashboard/events/rsvps", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(
        payload?.error ?? "Non riesco ad annullare l'iscrizione.",
      );
    }

    await loadEntries();
  };

  const countOf = (form: FormRow) =>
    counts?.find(
      (entry) =>
        entry.eventId === form.eventId && entry.blockKey === form.blockKey,
    );

  if (!forms.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarOff />
          </EmptyMedia>
          <EmptyTitle>Nessun modulo di iscrizione</EmptyTitle>
          <EmptyDescription>
            Nessun evento pubblicato contiene un modulo di iscrizione. Si
            aggiunge dallo Studio, dal menu «+» nel corpo dell'articolo.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const seatsTaken = entries?.reduce((total, entry) => total + entry.seats, 0);
  const seatsLeft =
    selected?.capacity != null && seatsTaken !== undefined
      ? Math.max(selected.capacity - seatsTaken, 0)
      : null;
  const lastEntry = entries?.length ? entries[entries.length - 1] : null;

  /**
   * La ricerca filtra solo la tabella. I riquadri qui sopra continuano a
   * contare tutti: «Persone attese: 3» perché si sta cercando un nome sarebbe
   * un numero sbagliato scritto in grande.
   */
  const visible = entries ? searchRsvps(entries, query) : undefined;

  const handleCancel = (entry: { id: string; name: string }) => {
    toast("Stai annullando un'iscrizione", {
      description: (
        <>
          Vuoi togliere{" "}
          <span className="font-semibold text-foreground">{entry.name}</span>{" "}
          dall'elenco? I posti tornano disponibili e la persona non riceve
          nessun avviso.
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => toast.dismiss()}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() =>
                cancelRsvp(entry.id)
                  .then(() => {
                    toast.dismiss();
                    toast.success("Iscrizione annullata", {
                      description: `${entry.name} non è più in elenco.`,
                    });
                  })
                  .catch(() => {
                    toast.dismiss();
                    toast.error("Non sono riuscito ad annullare l'iscrizione.");
                  })
              }
            >
              <Trash className="size-4" />
              Annulla iscrizione
            </Button>
          </div>
        </>
      ),
      duration: Number.POSITIVE_INFINITY,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Evento</span>
        <Select value={selected?.id} onValueChange={setSelectedId}>
          <SelectTrigger className="w-full bg-white md:w-[28rem]">
            <SelectValue placeholder="Scegli un evento" />
          </SelectTrigger>
          <SelectContent>
            {forms.map((form) => {
              const count = countOf(form);

              return (
                <SelectItem key={form.id} value={form.id}>
                  {form.eventTitle}
                  {form.showsHeading && form.heading
                    ? ` — ${form.heading}`
                    : ""}{" "}
                  <span className="text-muted-foreground">
                    ·{" "}
                    {format(new Date(form.dateStart), "d MMM yyyy", {
                      locale: it,
                    })}
                    {count ? ` · ${count.attendees} iscritti` : ""}
                  </span>
                </SelectItem>
              );
            })}
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
            {selected.closesAt && (
              <Badge
                variant="outline"
                className={
                  isRsvpClosed(selected.closesAt, now)
                    ? "bg-red-50 text-red-900 border-red-200"
                    : "bg-green-50 text-green-900 border-green-200"
                }
              >
                {isRsvpClosed(selected.closesAt, now)
                  ? "Iscrizioni chiuse"
                  : "Iscrizioni aperte"}
              </Badge>
            )}

            {/*
             * Quando non ha più senso aspettare iscritti, quel che serve non è
             * più questa pagina ma l'appello all'ingresso: il tasto compare da
             * sé, senza ricaricare, perché la sera dell'evento la dashboard
             * resta aperta.
             */}
            {isCheckInOpen(selected.closesAt, selected.dateStart, now) && (
              <Button asChild size="sm" className="ml-auto">
                <Link
                  href={`/dashboard/events/arrivi?form=${encodeURIComponent(selected.id)}`}
                >
                  <ClipboardCheck className="size-4" />
                  Registra arrivi
                </Link>
              </Button>
            )}
          </div>

          <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard label="Iscritti" value={entries?.length ?? "—"} />
            <StatCard
              label="Persone attese"
              value={seatsTaken ?? "—"}
              hint="Iscritti e accompagnatori."
            />
            <StatCard
              label="Posti rimasti"
              value={
                selected.capacity == null ? "Illimitati" : (seatsLeft ?? "—")
              }
              hint={
                selected.capacity == null
                  ? "Nessun tetto impostato sul modulo."
                  : `Capienza: ${seatsLabel(selected.capacity)}.`
              }
            />
            <StatCard
              label="Ultima iscrizione"
              value={
                lastEntry
                  ? formatDistanceToNow(lastEntry.createdAt, {
                      locale: it,
                      addSuffix: true,
                    })
                  : "—"
              }
            />
          </section>

          <Card>
            {/* `gap-x-6`: il testo arriva fin sotto al tasto, e senza respiro
                la descrizione sembra scritta dentro il bottone. */}
            <CardHeader className="gap-x-6">
              <CardTitle>Elenco iscritti</CardTitle>
              <CardDescription>
                In ordine di arrivo. Da qui si aggiunge chi si è fatto vivo per
                altre strade, si corregge chi porta qualcuno e si annulla chi
                non viene più: i posti si liberano da soli.
              </CardDescription>
              <CardAction>
                <NewRsvpDialog
                  form={selected}
                  seatsLeft={seatsLeft}
                  onCreated={loadEntries}
                />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              {entries !== undefined && entries.length > 0 && (
                <div>
                  {/* `relative` attorno al solo campo: vedi `arrivals.tsx`. */}
                  <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      placeholder="Cerca per nome o email…"
                      className="h-10 bg-white pl-9"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </div>
                  {query.trim() && visible && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {visible.length} di {entries.length} iscritti
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
                      Il modulo è pubblicato ma non è ancora arrivato nessuno.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : visible.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Search />
                    </EmptyMedia>
                    <EmptyTitle>Nessun iscritto trovato</EmptyTitle>
                    <EmptyDescription>
                      Nessuno fra i {entries.length} iscritti risponde a «
                      {query.trim()}». Prova con una parte del nome o con
                      l'indirizzo email.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Persone</TableHead>
                        <TableHead>Iscritto il</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {entry.name}
                          </TableCell>
                          <TableCell>
                            <a
                              href={`mailto:${entry.email}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {entry.email}
                            </a>
                            {entry.unsubscribedAt && (
                              <Badge
                                variant="outline"
                                className="ml-2 font-normal"
                                title="Non riceve le comunicazioni dell'evento. L'iscrizione resta valida."
                              >
                                <MailX className="size-3" />
                                Disiscritto
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.seats}
                            {entry.guests > 0 && (
                              <span className="text-muted-foreground">
                                {" "}
                                (+{entry.guests})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {format(entry.createdAt, "d MMM, HH:mm", {
                              locale: it,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <GuestsDialog
                                form={selected}
                                entry={entry}
                                seatsLeft={seatsLeft}
                                onSaved={loadEntries}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancel(entry)}
                              >
                                <Trash className="size-4" />
                                <span className="sr-only">
                                  Annulla iscrizione
                                </span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
