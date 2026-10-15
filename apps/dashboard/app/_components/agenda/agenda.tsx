"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { formatEuro } from "@padel-sport/backend/convex/modules/pricing/lib";
import { useQuery } from "convex/react";
import {
  CalendarCheck,
  CalendarOff,
  ChevronDown,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CountBadge } from "@/app/_components/count-badge";
import { ListGroup, ListRow } from "@/app/_components/list";
import { PageBody, PageHeader } from "@/app/_components/page-header";
import { SheetHeader } from "@/app/_components/sheet-header";
import { useConfirm } from "@/app/_providers/confirm.provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
} from "@/components/ui/responsive-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { mergeablePairs, mergedPartnerOf } from "@/lib/booking-merge";
import { EASE_OUT, UI_DURATION } from "@/lib/motion";
import { cn } from "@/lib/utils";

import MergePairs from "../merge-pairs";
import { BookingRow, PendingCard } from "./booking-row";
import { BookingSheet } from "./booking-sheet";
import { DayPager, useDaySwipe } from "./day-pager";
import { DayStrip } from "./day-strip";
import {
  type Booking,
  closedDay,
  dayKey,
  dayLabel,
  isCancelled,
  isPaidOnline,
  isPending,
  matchesSearch,
  stripDays,
} from "./lib";
import { NewBookingSheet } from "./new-booking-sheet";
import { useAgenda } from "./use-agenda";
import { useHideCancelled } from "./use-hide-cancelled";

/**
 * L'agenda: la prima pagina della dashboard e quella che lo staff apre di più.
 *
 * Risponde a tre domande, nell'ordine in cui ce le si fa allo sportello:
 * cosa aspetta una mia risposta (le prenotazioni da confermare, con le due
 * risposte già sotto il pollice), chi gioca oggi e a che ora (la giornata,
 * per orario e campo), e cosa si può sistemare (i campi da completare).
 *
 * I link delle notifiche continuano a funzionare: `?booking=` apre il
 * dettaglio di quella prenotazione sul suo giorno, `?day=` apre un giorno,
 * `?tab=merge` apre i campi da completare (utils/staffLinks.ts sul backend).
 */
export function Agenda() {
  const {
    bookings,
    busyId,
    reload,
    accept,
    cancel,
    refund,
    updatePlayers,
    reschedule,
    moveCourt,
    split,
  } = useAgenda();
  const courts = useQuery(api.modules.settings.booking.courts, {});
  // Gli orari e le chiusure: in agenda un giorno chiuso si vede.
  const schedule = useQuery(api.modules.settings.booking.get, {});
  const confirm = useConfirm();
  const searchParams = useSearchParams();

  const today = dayKey(Date.now());
  // `?day=` dai promemoria (modules/reminders): l'agenda si apre su quel
  // giorno. Uno già passato non è nella striscia, e si resta su oggi.
  const [selectedDay, setSelectedDay] = useState(() => {
    const linked = searchParams.get("day");
    return linked && /^\d{4}-\d{2}-\d{2}$/.test(linked) && linked >= today
      ? linked
      : today;
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(
    () => searchParams.get("tab") === "merge",
  );
  // Dal giorno in agenda si uniscono le coppie di quel giorno. Il link delle
  // notifiche (`?tab=merge`) non dice quale giorno, e le mostra tutte.
  const [mergeScope, setMergeScope] = useState<"day" | "all">(() =>
    searchParams.get("tab") === "merge" ? "all" : "day",
  );
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const reduce = useReducedMotion();
  const swipe = useDaySwipe();

  const courtNames = useMemo(
    () => new Map((courts ?? []).map((court) => [court.id, court.name])),
    [courts],
  );

  const list = bookings ?? [];
  const pending = useMemo(() => list.filter(isPending), [list]);
  const pairs = useMemo(() => mergeablePairs(list), [list]);
  const days = useMemo(() => stripDays(list), [list]);
  const closedDays = useMemo(
    () => new Set(days.filter((day) => closedDay(schedule, day))),
    [days, schedule],
  );

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

  // Le prenotazioni giorno per giorno, in ordine d'orario. Per giorno e non
  // solo per quello scelto: da telefono, scorrendo, si vedono anche i giorni
  // accanto (day-pager.tsx).
  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of list) {
      const key = dayKey(booking.bookingDate);
      const rows = map.get(key);
      if (rows) rows.push(booking);
      else map.set(key, [booking]);
    }
    for (const rows of map.values()) {
      rows.sort((a, b) => a.bookingDate - b.bookingDate);
    }
    return map;
  }, [list]);

  const pairsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const pair of pairs) {
      const key = dayKey(pair.keep.bookingDate);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [pairs]);

  // Le annullate in un elenco a parte, più in basso: la giornata si legge
  // senza, e chi le cerca le trova. Chiuderlo vale per tutti i giorni.
  const [hideCancelled, setHideCancelled] = useHideCancelled();
  const cancelledListId = useId();

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
      description: isPaidOnline(booking)
        ? `${booking.bookedBy} ha già pagato online ${formatEuro(booking.paidAmount ?? 0)}.`
        : `${booking.bookedBy} pagherà in struttura all'arrivo.`,
      confirmLabel: "Conferma",
      checkbox: {
        label: "Avvisa il cliente su WhatsApp",
        defaultChecked: true,
      },
    });
    if (result) await accept(booking, result.checked);
  };

  const askCancel = async (booking: Booking) => {
    const paid = isPaidOnline(booking);
    const result = await confirm({
      title: isPending(booking)
        ? "Rifiutare la prenotazione?"
        : "Annullare la prenotazione?",
      description: `${booking.bookedBy} riceve l'avviso della cancellazione e il campo torna libero. Non si può tornare indietro.`,
      confirmLabel: isPending(booking) ? "Rifiuta" : "Annulla prenotazione",
      cancelLabel: "Indietro",
      tone: "destructive",
      // Spunta già messa: chi annulla una prenotazione pagata di solito
      // restituisce i soldi. Togliendola si rimborsa dopo, dalla scheda.
      checkbox: paid
        ? {
            label: `Rimborsa il pagamento online (${formatEuro(booking.paidAmount ?? 0)})`,
            defaultChecked: true,
          }
        : undefined,
    });
    if (result && (await cancel(booking, paid && result.checked))) {
      setOpenId(null);
    }
  };

  const askRefund = async (
    booking: Booking,
    paymentId: string,
    amount: number,
  ) => {
    const result = await confirm({
      title: "Rimborsare il pagamento?",
      description: `${formatEuro(amount)} tornano a ${booking.bookedBy} sulla carta con cui ha pagato. La commissione SumUp non viene restituita, e il rimborso non si può annullare.`,
      confirmLabel: `Rimborsa ${formatEuro(amount)}`,
      cancelLabel: "Indietro",
      tone: "destructive",
    });
    if (result) await refund(booking, paymentId);
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
        <div data-tour="agenda-actions" className="flex items-center gap-2">
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
            {/*
             * Le due icone stanno una sopra l'altra e si scambiano: una si
             * rimpicciolisce e sparisce mentre l'altra cresce al suo posto.
             * È una transizione CSS, e un secondo tocco a metà riparte da dove
             * si trova invece che da capo.
             */}
            <span className="grid *:col-start-1 *:row-start-1">
              <Search
                className={cn(
                  ICON_SWAP,
                  searching ? "scale-60 opacity-0" : "scale-100 opacity-100",
                )}
              />
              <X
                className={cn(
                  ICON_SWAP,
                  searching ? "scale-100 opacity-100" : "scale-60 opacity-0",
                )}
              />
            </span>
          </Button>
          <Button
            size="icon"
            className="size-10 rounded-full"
            aria-label="Nuova prenotazione"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-5" />
          </Button>
        </div>
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

  /**
   * Un giorno dell'agenda: le partite, le annullate a parte, e le coppie da
   * unire se ce ne sono. È una funzione perché da telefono se ne disegnano
   * tre, il giorno scelto e i due accanto (day-pager.tsx).
   */
  const renderDay = (day: string) => {
    const rows = byDay.get(day) ?? [];
    const playing = rows.filter((booking) => !isCancelled(booking));
    const cancelled = rows.filter(isCancelled);
    const dayPairs = pairsByDay.get(day) ?? 0;
    const closed = closedDay(schedule, day);
    const cancelledId = `${cancelledListId}-${day}`;

    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <ListGroup
            title={dayLabel(day, today)}
            action={
              playing.length > 0 && (
                <span className="text-muted-foreground text-[13px] tabular-nums">
                  {playing.length}{" "}
                  {playing.length === 1 ? "partita" : "partite"}
                </span>
              )
            }
          >
            {/*
             * Chiuso ma con delle partite: prese prima della chiusura, restano.
             * Lo staff le vede in cima, con il perché.
             */}
            {closed && playing.length > 0 && (
              <div className="bg-warning-subtle text-warning-foreground flex items-center gap-3 px-4 py-2.5 text-[13px] leading-snug">
                <CalendarOff className="size-4 shrink-0" />
                <span>
                  <span className="font-medium">{closed.title}.</span>{" "}
                  {closed.detail}. Le partite già prese restano.
                </span>
              </div>
            )}
            {playing.length === 0 && closed ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <CalendarOff className="text-muted-foreground/60 size-7" />
                <p className="text-[15px] font-medium">{closed.title}</p>
                <p className="text-muted-foreground max-w-[32ch] text-sm">
                  {closed.detail}. Sito e app non accettano prenotazioni.
                </p>
              </div>
            ) : playing.length === 0 ? (
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
              playing.map((booking) => (
                <BookingRow
                  key={booking._id}
                  booking={booking}
                  court={courtNames.get(booking.slot)}
                  onOpen={() => openRow(booking)}
                />
              ))
            )}
          </ListGroup>

          {cancelled.length > 0 && (
            <section className="space-y-2 pt-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="text-muted-foreground text-[13px] font-medium">
                  Annullate · {cancelled.length}
                </h2>
                <button
                  type="button"
                  aria-expanded={!hideCancelled}
                  aria-controls={cancelledId}
                  onClick={() => setHideCancelled(!hideCancelled)}
                  className="text-muted-foreground hover:text-foreground focus-visible:text-foreground -my-2 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[13px] font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {hideCancelled ? "Mostra" : "Nascondi"}
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
                      hideCancelled && "-rotate-90",
                    )}
                  />
                </button>
              </div>
              <AnimatePresence initial={false}>
                {!hideCancelled && (
                  <motion.div
                    id={cancelledId}
                    key="cancelled"
                    initial={
                      reduce ? { opacity: 0 } : { opacity: 0, height: 0 }
                    }
                    animate={{
                      opacity: 1,
                      height: "auto",
                      transition: {
                        duration: UI_DURATION.enter,
                        ease: EASE_OUT,
                      },
                    }}
                    exit={{
                      opacity: 0,
                      ...(reduce ? {} : { height: 0 }),
                      transition: {
                        duration: UI_DURATION.exit,
                        ease: EASE_OUT,
                      },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="bg-card overflow-hidden rounded-2xl border [&>*+*]:border-t">
                      {cancelled.map((booking) => (
                        <BookingRow
                          key={booking._id}
                          booking={booking}
                          court={courtNames.get(booking.slot)}
                          onOpen={() => openRow(booking)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}
        </div>

        {/* Solo nel giorno che ha davvero una coppia da unire. */}
        {dayPairs > 0 && (
          <ListGroup footer="Due gruppi parziali alla stessa ora riempiono un campo, e l'altro torna prenotabile.">
            <ListRow
              leading={<Users className="size-5" />}
              title="Campi da completare"
              subtitle={`${dayPairs} ${dayPairs === 1 ? "coppia da unire" : "coppie da unire"}`}
              trailing={<CountBadge count={dayPairs} />}
              chevron
              onClick={() => {
                setMergeScope("day");
                setMergeOpen(true);
              }}
            />
          </ListGroup>
        )}
      </div>
    );
  };

  /**
   * Il passaggio fra agenda e ricerca.
   *
   * La ricerca scende di poco dall'alto, dal pulsante che l'ha aperta;
   * l'agenda risale dal basso quando la si richiude. Le due viste si danno il
   * cambio insieme, senza aspettarsi (`popLayout`): quella che esce si stacca
   * dal flusso e sfuma mentre l'altra entra, così il tocco ha risposta
   * subito. Con il movimento ridotto resta solo la dissolvenza.
   */
  const view = (from: "above" | "below") => {
    const away = reduce
      ? "translateY(0px)"
      : `translateY(${from === "above" ? -8 : 8}px)`;
    return {
      initial: { opacity: 0, transform: away },
      animate: {
        opacity: 1,
        transform: "translateY(0px)",
        transition: { duration: UI_DURATION.enter, ease: EASE_OUT },
      },
      exit: {
        opacity: 0,
        transform: away,
        transition: { duration: UI_DURATION.exit, ease: EASE_OUT },
      },
    };
  };

  return (
    <>
      {/*
       * Da telefono tutta la pagina, fino in fondo allo schermo, è la
       * superficie da cui si cambia giorno scorrendo di lato: anche lo spazio
       * vuoto sotto un giorno con poche partite (day-pager.tsx). In
       * verticale scorre come sempre, e lo zoom resta.
       */}
      <div
        {...(searching ? {} : swipe.surfaceProps)}
        className="flex flex-1 flex-col max-md:touch-pan-y max-md:touch-pinch-zoom"
      >
        {header}
        <PageBody className="relative">
          <AnimatePresence mode="popLayout" initial={false}>
            {searching ? (
              <motion.div key="search" {...view("above")} className="space-y-5">
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
              </motion.div>
            ) : (
              <motion.div key="agenda" {...view("below")} className="space-y-6">
                {pending.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="flex items-center gap-2 px-1 text-[13px] font-medium">
                      <span className="text-muted-foreground">
                        Da confermare
                      </span>
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
                    closed={closedDays}
                  />

                  <DayPager
                    swipe={swipe}
                    days={days}
                    selected={selectedDay}
                    onSelect={setSelectedDay}
                    renderDay={renderDay}
                  />
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </PageBody>
      </div>

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
        onRefund={(booking, paymentId, amount) =>
          void askRefund(booking, paymentId, amount)
        }
        onUpdatePlayers={updatePlayers}
        onReschedule={reschedule}
        onMoveCourt={moveCourt}
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
          <SheetHeader
            title="Campi da completare"
            description={
              mergeScope === "day"
                ? `${dayLabel(selectedDay, today)}. In cima le coppie dello stesso livello.`
                : "In cima le coppie dello stesso livello."
            }
          />
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:-mx-1 md:px-1 md:pb-0">
            <MergePairs
              bookings={
                mergeScope === "day"
                  ? list.filter(
                      (booking) => dayKey(booking.bookingDate) === selectedDay,
                    )
                  : list
              }
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

/**
 * Lo scambio d'icona del pulsante di ricerca: veloce come la risposta a un
 * tocco. Con il movimento ridotto le icone sfumano senza cambiare misura.
 */
const ICON_SWAP =
  "size-5 transition-[opacity,scale] duration-150 ease-(--ease-out) motion-reduce:scale-100";

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
