"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { CalendarCheck, Plus, Search, Users, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { CountBadge } from "@/app/(dashboard)/_components/count-badge";
import { ListGroup, ListRow } from "@/app/(dashboard)/_components/list";
import {
  PageBody,
  PageHeader,
} from "@/app/(dashboard)/_components/page-header";
import { useConfirm } from "@/app/(dashboard)/_providers/confirm.provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerHeader,
} from "@/components/ui/responsive-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { mergeablePairs, mergedPartnerOf } from "@/lib/booking-merge";

import MergePairs from "../merge-pairs";
import { BookingRow, PendingCard } from "./booking-row";
import { BookingSheet } from "./booking-sheet";
import { DayStrip } from "./day-strip";
import {
  type Booking,
  dayKey,
  dayLabel,
  isCancelled,
  isPending,
  matchesSearch,
  stripDays,
} from "./lib";
import { NewBookingSheet } from "./new-booking-sheet";
import { useAgenda } from "./use-agenda";

/**
 * L'agenda: la prima pagina della dashboard e quella che lo staff apre di più.
 *
 * Risponde a tre domande, nell'ordine in cui ce le si fa allo sportello:
 * cosa aspetta una mia risposta (le prenotazioni da confermare, con le due
 * risposte già sotto il pollice), chi gioca oggi e a che ora (la giornata,
 * per orario e campo), e cosa si può sistemare (i campi da completare).
 *
 * I link delle notifiche continuano a funzionare: `?booking=` apre il
 * dettaglio di quella prenotazione sul suo giorno, `?tab=merge` apre i campi
 * da completare (utils/staffLinks.ts sul backend).
 */
export function Agenda() {
  const { bookings, busyId, reload, accept, cancel, split } = useAgenda();
  const courts = useQuery(api.modules.settings.booking.courts, {});
  const confirm = useConfirm();
  const searchParams = useSearchParams();

  const today = dayKey(Date.now());
  const [selectedDay, setSelectedDay] = useState(today);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(
    () => searchParams.get("tab") === "merge",
  );
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const courtNames = useMemo(
    () => new Map((courts ?? []).map((court) => [court.id, court.name])),
    [courts],
  );

  const list = bookings ?? [];
  const pending = useMemo(() => list.filter(isPending), [list]);
  const pairs = useMemo(() => mergeablePairs(list), [list]);
  const days = useMemo(() => stripDays(list), [list]);

  const marks = useMemo(() => {
    const map = new Map<string, { total: number; pending: boolean }>();
    for (const booking of list) {
      if (isCancelled(booking)) continue;
      const key = dayKey(booking.bookingDate);
      const mark = map.get(key) ?? { total: 0, pending: false };
      mark.total += 1;
      mark.pending ||= isPending(booking);
      map.set(key, mark);
    }
    return map;
  }, [list]);

  const ofDay = useMemo(
    () =>
      list
        .filter((booking) => dayKey(booking.bookingDate) === selectedDay)
        .sort(
          (a, b) =>
            Number(isCancelled(a)) - Number(isCancelled(b)) ||
            a.bookingDate - b.bookingDate,
        ),
    [list, selectedDay],
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return list
      .filter((booking) => matchesSearch(booking, query))
      .sort((a, b) => a.bookingDate - b.bookingDate);
  }, [list, query]);

  // Il link di una notifica: si apre il dettaglio sul giorno giusto, una volta.
  const handledLink = useRef(false);
  useEffect(() => {
    const target = searchParams.get("booking");
    if (!target || !bookings || handledLink.current) return;
    const booking = bookings.find((row) => row._id === target);
    if (!booking) return;
    handledLink.current = true;
    setSelectedDay(dayKey(booking.bookingDate));
    setOpenId(booking._id);
  }, [bookings, searchParams]);

  const open = list.find((booking) => booking._id === openId) ?? null;

  const askAccept = async (booking: Booking) => {
    const result = await confirm({
      title: "Confermare la prenotazione?",
      description: `${booking.bookedBy} pagherà in struttura all'arrivo.`,
      confirmLabel: "Conferma",
      checkbox: {
        label: "Avvisa il cliente su WhatsApp",
        defaultChecked: true,
      },
    });
    if (result) await accept(booking, result.checked);
  };

  const askCancel = async (booking: Booking) => {
    const result = await confirm({
      title: isPending(booking)
        ? "Rifiutare la prenotazione?"
        : "Annullare la prenotazione?",
      description: `${booking.bookedBy} riceve l'avviso della cancellazione e il campo torna libero. Non si può tornare indietro.`,
      confirmLabel: isPending(booking) ? "Rifiuta" : "Annulla prenotazione",
      cancelLabel: "Indietro",
      tone: "destructive",
    });
    if (result && (await cancel(booking))) setOpenId(null);
  };

  const askSplit = async (booking: Booking) => {
    const result = await confirm({
      title: "Separare le prenotazioni?",
      description:
        "La seconda torna su un campo libero alla stessa ora, se ce n'è uno.",
      confirmLabel: "Separa",
      cancelLabel: "Indietro",
    });
    if (result) await split(booking);
  };

  const header = (
    <PageHeader
      title="Agenda"
      description="Le prenotazioni da confermare, la giornata per orario e campo, i campi da completare."
      actions={
        <>
          <Button
            variant="secondary"
            size="icon"
            className="size-10 rounded-full"
            aria-label={
              searching ? "Chiudi la ricerca" : "Cerca una prenotazione"
            }
            aria-pressed={searching}
            onClick={() => {
              setSearching((value) => !value);
              setQuery("");
            }}
          >
            {searching ? (
              <X className="size-5" />
            ) : (
              <Search className="size-5" />
            )}
          </Button>
          <Button
            size="icon"
            className="size-10 rounded-full"
            aria-label="Nuova prenotazione"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-5" />
          </Button>
        </>
      }
    />
  );

  if (bookings === undefined) {
    return (
      <>
        {header}
        <AgendaSkeleton />
      </>
    );
  }

  const openRow = (booking: Booking) => setOpenId(booking._id);

  return (
    <>
      {header}
      <PageBody>
        {searching ? (
          <div className="space-y-5">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, giocatore, telefono o codice"
                className="bg-card h-11 rounded-xl pl-10 text-base"
              />
            </div>
            {query.trim() &&
              (results.length === 0 ? (
                <p className="text-muted-foreground px-1 text-sm">
                  Nessuna prenotazione trovata.
                </p>
              ) : (
                <ListGroup
                  title={`${results.length} ${results.length === 1 ? "prenotazione" : "prenotazioni"}`}
                >
                  {results.map((booking) => (
                    <div key={booking._id}>
                      <p className="text-muted-foreground px-4 pt-2.5 text-xs font-medium">
                        {dayLabel(dayKey(booking.bookingDate), today)}
                      </p>
                      <BookingRow
                        booking={booking}
                        court={courtNames.get(booking.slot)}
                        onOpen={() => openRow(booking)}
                      />
                    </div>
                  ))}
                </ListGroup>
              ))}
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section className="space-y-2">
                <h2 className="flex items-center gap-2 px-1 text-[13px] font-medium">
                  <span className="text-muted-foreground">Da confermare</span>
                  <CountBadge count={pending.length} />
                </h2>
                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                  {pending.map((booking) => (
                    <PendingCard
                      key={booking._id}
                      booking={booking}
                      court={courtNames.get(booking.slot)}
                      busy={busyId === booking._id}
                      onOpen={() => openRow(booking)}
                      onAccept={() => void askAccept(booking)}
                      onReject={() => void askCancel(booking)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <DayStrip
                days={days}
                selected={selectedDay}
                onSelect={setSelectedDay}
                marks={marks}
              />

              <ListGroup
                title={dayLabel(selectedDay, today)}
                action={
                  ofDay.length > 0 && (
                    <span className="text-muted-foreground text-[13px] tabular-nums">
                      {ofDay.filter((row) => !isCancelled(row)).length}{" "}
                      {ofDay.filter((row) => !isCancelled(row)).length === 1
                        ? "partita"
                        : "partite"}
                    </span>
                  )
                }
              >
                {ofDay.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                    <CalendarCheck className="text-muted-foreground/60 size-7" />
                    <p className="text-[15px] font-medium">
                      Nessuna partita in agenda
                    </p>
                    <p className="text-muted-foreground max-w-[32ch] text-sm">
                      Le prenotazioni di questo giorno compariranno qui appena
                      arrivano.
                    </p>
                  </div>
                ) : (
                  ofDay.map((booking) => (
                    <BookingRow
                      key={booking._id}
                      booking={booking}
                      court={courtNames.get(booking.slot)}
                      onOpen={() => openRow(booking)}
                    />
                  ))
                )}
              </ListGroup>
            </section>

            {pairs.length > 0 && (
              <ListGroup footer="Due gruppi parziali alla stessa ora riempiono un campo, e l'altro torna prenotabile.">
                <ListRow
                  leading={<Users className="size-5" />}
                  title="Campi da completare"
                  subtitle={`${pairs.length} ${pairs.length === 1 ? "coppia da unire" : "coppie da unire"}`}
                  trailing={<CountBadge count={pairs.length} />}
                  chevron
                  onClick={() => setMergeOpen(true)}
                />
              </ListGroup>
            )}
          </>
        )}
      </PageBody>

      <BookingSheet
        booking={open}
        partner={open ? mergedPartnerOf(open, list) : undefined}
        court={open ? courtNames.get(open.slot) : undefined}
        busy={open ? busyId === open._id : false}
        onOpenChange={(next) => {
          if (!next) setOpenId(null);
        }}
        onAccept={(booking) => void askAccept(booking)}
        onCancel={(booking) => void askCancel(booking)}
        onSplit={(booking) => void askSplit(booking)}
      />

      <NewBookingSheet
        open={creating}
        onOpenChange={setCreating}
        initialDay={selectedDay}
        onCreated={(day) => {
          setSearching(false);
          setSelectedDay(day);
          void reload();
        }}
      />

      <ResponsiveDrawer open={mergeOpen} setOpen={setMergeOpen}>
        <ResponsiveDrawerContent className="sm:max-w-2xl md:max-h-[90dvh] md:overflow-y-auto">
          <ResponsiveDrawerHeader
            title="Campi da completare"
            description="In cima le coppie dello stesso livello."
          />
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-0 md:pb-0">
            <MergePairs
              bookings={list}
              courts={(courts ?? []).map((court) => ({
                id: court.id,
                name: court.name,
              }))}
              onMerged={() => void reload()}
            />
          </div>
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>
    </>
  );
}

/** La forma della pagina mentre arriva: striscia dei giorni e righe. */
function AgendaSkeleton() {
  return (
    <PageBody>
      <div className="flex gap-1">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: segnaposto senza identità.
            key={index}
            className="flex w-11 flex-col items-center gap-1.5 py-1"
          >
            <Skeleton className="h-3 w-4" />
            <Skeleton className="size-10 rounded-full" />
          </div>
        ))}
      </div>
      <div className="bg-card overflow-hidden rounded-2xl border">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: segnaposto senza identità.
            key={index}
            className="flex items-center gap-4 border-t px-4 py-3.5 first:border-t-0"
          >
            <Skeleton className="h-9 w-12" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </PageBody>
  );
}
