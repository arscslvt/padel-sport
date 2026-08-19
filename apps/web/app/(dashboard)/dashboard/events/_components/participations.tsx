"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarClock, CalendarOff, Trash, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/(dashboard)/_components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/(dashboard)/_components/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { isRsvpClosed, seatsLabel } from "@/lib/event-rsvp";
import { formatEventDate } from "@/lib/events";
import type { EventWithRsvpForms } from "@/sanity/types";

/**
 * Un modulo per riga: la coppia evento + blocco è la chiave con cui Convex
 * tiene le iscrizioni, e un evento può ospitare più di un modulo.
 */
type FormRow = {
  id: string;
  eventId: string;
  blockKey: string;
  eventTitle: string;
  eventSlug: string;
  dateStart: string;
  dateEnd?: string | null;
  heading?: string | null;
  capacity?: number | null;
  closesAt?: string | null;
  /** Compare nell'etichetta solo se l'evento ha più moduli: altrimenti è rumore. */
  showsHeading: boolean;
};

function flattenForms(events: EventWithRsvpForms[]): FormRow[] {
  return events.flatMap((event) =>
    event.forms.map((form) => ({
      id: `${event._id}:${form._key}`,
      eventId: event._id,
      blockKey: form._key,
      eventTitle: event.title,
      eventSlug: event.slug,
      dateStart: event.dateStart,
      dateEnd: event.dateEnd,
      heading: form.heading,
      capacity: form.capacity,
      closesAt: form.closesAt,
      showsHeading: event.forms.length > 1,
    })),
  );
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
  const [selectedId, setSelectedId] = useState(forms[0]?.id ?? "");

  const selected = forms.find((form) => form.id === selectedId) ?? forms[0];

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
    <Tabs defaultValue="participations" className="space-y-4">
      <TabsList className="w-full md:w-max">
        <TabsTrigger value="participations">Partecipazioni</TabsTrigger>
      </TabsList>

      <TabsContent value="participations" className="space-y-6">
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
                    isRsvpClosed(selected.closesAt)
                      ? "bg-red-50 text-red-900 border-red-200"
                      : "bg-green-50 text-green-900 border-green-200"
                  }
                >
                  {isRsvpClosed(selected.closesAt)
                    ? "Iscrizioni chiuse"
                    : "Iscrizioni aperte"}
                </Badge>
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
              <CardHeader>
                <CardTitle>Elenco iscritti</CardTitle>
                <CardDescription>
                  In ordine di arrivo. Annullare un'iscrizione libera i posti
                  che occupava.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {entries === undefined ? (
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
                        {entries.map((entry) => (
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
      </TabsContent>
    </Tabs>
  );
}
