"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { formatEuro } from "@padel-sport/backend/convex/modules/pricing/lib";
import {
  closureHoursLabel,
  hourClosuresOn,
} from "@padel-sport/backend/convex/modules/settings/schedule";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
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
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
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
import type { Viewer } from "@/lib/staff-name";
import { cn } from "@/lib/utils";

import MergePairs from "../merge-pairs";
import { BookingRow, PendingCard } from "./booking-row";
import { BookingSheet } from "./booking-sheet";
import { DayNavigator } from "./day-navigator";
import { DayPager, useDaySwipe } from "./day-pager";
import { DayPickerButton } from "./day-picker";
import { DayStrip } from "./day-strip";
import { AgendaTitle } from "./greeting";
import {
  addDays,
  type Booking,
  closedDay,
  courtLabel,
  dayKey,
  dayLabel,
  fullDayLabel,
  isCancelled,
  isPaidOnline,
  isPending,
  matchesSearch,
  stripDays,
} from "./lib";
import { isConcluded, isLive, LiveMatches, useNow } from "./live-matches";
import { NewBookingSheet } from "./new-booking-sheet";
import { useAgenda } from "./use-agenda";
import { useHideCancelled, useHideConcluded } from "./use-hide-cancelled";
import { usePastDay } from "./use-past-day";
import { FORECAST_DAYS, WeatherPanel, WeatherWidget } from "./weather";

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
 *
 * Il titolo saluta per qualche istante chi la apre (greeting.tsx), e accanto
 * al giorno scelto c'è il meteo al
 * club (weather.tsx): da desktop in una colonna a destra, da telefono in una
 * riga bassa sotto la striscia dei giorni.
 */
export function Agenda({
  viewer,
  canClose,
}: {
  viewer: Viewer | null;
  canClose: boolean;
}) {
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
    updatePhone,
    resendWhatsapp,
    resendEmail,
    notifyMissing,
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
  // Un giorno già passato, scelto dal calendario: si guarda da solo, fuori
  // dalla striscia, che parte da oggi.
  const [pastDay, setPastDay] = useState<string | null>(null);
  const past = usePastDay(pastDay);

  // Da telefono la striscia si apre a calendario (day-navigator.tsx).
  const [calendarOpen, setCalendarOpen] = useState(false);

  const goToDay = (key: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
    setSearching(false);
    setCalendarOpen(false);
    if (key < today) {
      setPastDay(key);
    } else {
      setPastDay(null);
      setSelectedDay(key);
    }
  };
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
  // Da stamattina (use-agenda.ts): le partite di oggi già cominciate stanno
  // in cima o fra le concluse, non fra quelle da confermare.
  const now = useNow();
  const pending = useMemo(
    () =>
      list.filter(
        (booking) => isPending(booking) && booking.bookingDate >= Date.now(),
      ),
    [list],
  );
  const pairs = useMemo(() => mergeablePairs(list), [list]);

  // Il meteo di tutti i giorni che Open-Meteo prevede, in una volta: si
  // cambia giorno e c'è già. Un giorno passato si chiede a parte.
  const weatherRows = useQuery(api.modules.weather.data.range, {
    from: today,
    to: addDays(today, FORECAST_DAYS - 1),
  });
  const pastWeather = useQuery(
    api.modules.weather.data.range,
    pastDay ? { from: pastDay, to: pastDay } : "skip",
  );
  const weather = {
    day: pastDay ?? selectedDay,
    today,
    rows: pastDay ? pastWeather : weatherRows,
    schedule,
    now,
    canClose,
  };

  /**
   * L'agenda a sinistra e il meteo a destra, da desktop. Sotto quella
   * larghezza la colonna non ci sta accanto alle schede: il meteo diventa la
   * riga sotto la striscia dei giorni, e qui resta solo l'agenda.
   */
  const withWeather = (main: ReactNode) => (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="relative min-w-0">{main}</div>
      <aside className="hidden lg:sticky lg:top-6 lg:block">
        <WeatherPanel {...weather} />
      </aside>
    </div>
  );
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
  // Le concluse di oggi, come le annullate: in fondo, e si richiudono.
  const [hideConcluded, setHideConcluded] = useHideConcluded();
  const concludedListId = useId();

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

  const open =
    [...list, ...(past.rows ?? [])].find((booking) => booking._id === openId) ??
    null;

  // Partono messaggi veri a persone che non li aspettano più da giorni: si
  // chiede prima, dicendo a chi.
  const askNotifyMissing = async (booking: Booking, names: string[]) => {
    const result = await confirm({
      title: "Mandare la conferma a chi manca?",
      description: `Partono la mail con il QR e il WhatsApp a ${names.join(", ")}.`,
      confirmLabel: "Manda",
    });
    if (result) await notifyMissing(booking);
  };

  const askAccept = async (booking: Booking) => {
    const result = await confirm({
      title: "Confermare la prenotazione?",
      description: isPaidOnline(booking)
        ? `È già pagata online, ${formatEuro(booking.paidAmount ?? 0)}.`
        : "Si paga in struttura all'arrivo.",
      confirmLabel: "Conferma",
      checkbox: {
        label: "Avvisa i giocatori su WhatsApp",
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
      description:
        "Parte l'avviso della cancellazione e il campo torna libero. Non si può tornare indietro.",
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
      description: `${formatEuro(amount)} tornano sulla carta con cui è stata pagata. La commissione SumUp non viene restituita, e il rimborso non si può annullare.`,
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
      title={<AgendaTitle viewer={viewer} />}
      // Il saluto si mette a fuoco da sfocato: la sfocatura deve poter
      // uscire dai bordi del titolo invece di finire tagliata.
      clipTitle={false}
      description={fullDayLabel(today)}
      actions={
        <div data-tour="agenda-actions" className="flex items-center gap-2">
          {/* Un giorno qualsiasi fino a oggi, anche passato. */}
          <DayPickerButton
            selected={pastDay ?? selectedDay}
            today={today}
            active={pastDay !== null}
            expanded={calendarOpen}
            onToggle={() => setCalendarOpen((open) => !open)}
            onPick={goToDay}
          />
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
    // Intestazione e meteo nello stesso posto dell'albero in cui stanno ad
    // agenda arrivata (il `div` qui sotto, più in basso): così React non li
    // rimonta all'arrivo delle prenotazioni, e il saluto e l'entrata del meteo
    // non ripartono da capo.
    return (
      <div className="flex flex-1 flex-col">
        {header}
        <PageBody>{withWeather(<AgendaSkeleton />)}</PageBody>
      </div>
    );
  }

  const openRow = (booking: Booking) => setOpenId(booking._id);

  /**
   * Un giorno dell'agenda: in cima quelle in corso, poi quelle da giocare, in
   * fondo le concluse e le annullate, e le coppie da unire se ce ne sono. È
   * una funzione perché da telefono se ne disegnano tre, il giorno scelto e i
   * due accanto (day-pager.tsx).
   */
  const renderDay = (day: string, override?: Booking[]) => {
    const rows = override ?? byDay.get(day) ?? [];
    // Un giorno passato è tutto giocato: le partite stanno nell'elenco
    // principale, non ripiegate fra le concluse.
    const isPast = day < today;
    const playing = rows.filter((booking) => !isCancelled(booking));
    const live = isPast
      ? []
      : playing.filter((booking) => isLive(booking, now));
    const concluded = isPast
      ? []
      : playing.filter((booking) => isConcluded(booking, now));
    const upcoming = isPast
      ? playing
      : playing.filter(
          (booking) => !live.includes(booking) && !concluded.includes(booking),
        );
    const cancelled = rows.filter(isCancelled);
    const dayPairs = pairsByDay.get(day) ?? 0;
    const closed = closedDay(schedule, day);
    // Le ore chiuse per maltempo (o altro), dette in cima come la chiusura.
    const closedHours = schedule ? hourClosuresOn(schedule, day) : [];
    const cancelledId = `${cancelledListId}-${day}`;
    const concludedId = `${concludedListId}-${day}`;

    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <LiveMatches
            live={live}
            now={now}
            courtNames={courtNames}
            onOpen={openRow}
          />

          {/* Ogni partita è una scheda a sé: sotto può spuntarle la tasca
              con quel che c'è da fare (booking-row.tsx). */}
          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 className="text-muted-foreground text-[13px] font-medium">
                {dayLabel(day, today)}
              </h2>
              {upcoming.length > 0 && (
                <span className="text-muted-foreground text-[13px] tabular-nums">
                  {upcoming.length}{" "}
                  {upcoming.length === 1 ? "partita" : "partite"}
                  {isPast && (upcoming.length === 1 ? " giocata" : " giocate")}
                </span>
              )}
            </div>
            {/*
             * Chiuso ma con delle partite: prese prima della chiusura, restano.
             * Lo staff le vede in cima, con il perché.
             */}
            {closed && playing.length > 0 && (
              <div className="bg-warning-subtle text-warning-foreground border-warning-border flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-[13px] leading-snug">
                <CalendarOff className="size-4 shrink-0" />
                <span>
                  <span className="font-medium">{closed.title}.</span>{" "}
                  {closed.detail}. Le partite già prese restano.
                </span>
              </div>
            )}
            {closedHours.length > 0 && (
              <div className="bg-warning-subtle text-warning-foreground border-warning-border flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-[13px] leading-snug">
                <CalendarOff className="size-4 shrink-0" />
                <span>
                  <span className="font-medium">
                    Chiuso{" "}
                    {closedHours
                      .map((closure) => closureHoursLabel(closure))
                      .join(" e ")}
                    {closedHours[0].reason
                      ? `, ${closedHours[0].reason.toLowerCase()}`
                      : ""}
                    .
                  </span>{" "}
                  Le partite già prese in quelle ore restano.
                </span>
              </div>
            )}
            {isPast && playing.length === 0 ? (
              <div className="bg-card flex flex-col items-center gap-2 rounded-2xl border px-6 py-10 text-center">
                <CalendarCheck className="text-muted-foreground/60 size-7" />
                <p className="text-[15px] font-medium">
                  Nessuna partita giocata
                </p>
                <p className="text-muted-foreground max-w-[32ch] text-sm">
                  In questo giorno non c&apos;erano prenotazioni.
                </p>
              </div>
            ) : upcoming.length === 0 && playing.length > 0 ? (
              // Oggi c'è stato o c'è del gioco, ma non resta altro in agenda.
              <p className="text-muted-foreground bg-card rounded-2xl border px-4 py-3 text-sm">
                Nessun'altra partita da giocare oggi.
              </p>
            ) : playing.length === 0 && closed ? (
              <div className="bg-card flex flex-col items-center gap-2 rounded-2xl border px-6 py-10 text-center">
                <CalendarOff className="text-muted-foreground/60 size-7" />
                <p className="text-[15px] font-medium">{closed.title}</p>
                <p className="text-muted-foreground max-w-[32ch] text-sm">
                  {closed.detail}. Sito e app non accettano prenotazioni.
                </p>
              </div>
            ) : playing.length === 0 ? (
              <div className="bg-card flex flex-col items-center gap-2 rounded-2xl border px-6 py-10 text-center">
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
              <div className="space-y-2.5">
                {upcoming.map((booking) => (
                  <BookingRow
                    key={booking._id}
                    booking={booking}
                    court={courtLabel(booking, courtNames)}
                    concluded={isPast}
                    onOpen={() => openRow(booking)}
                  />
                ))}
              </div>
            )}
          </section>

          <FoldedList
            id={concludedId}
            title="Concluse"
            count={concluded.length}
            hidden={hideConcluded}
            onToggle={() => setHideConcluded(!hideConcluded)}
          >
            {concluded.map((booking) => (
              <BookingRow
                key={booking._id}
                booking={booking}
                court={courtLabel(booking, courtNames)}
                concluded
                onOpen={() => openRow(booking)}
              />
            ))}
          </FoldedList>

          <FoldedList
            id={cancelledId}
            title="Annullate"
            count={cancelled.length}
            hidden={hideCancelled}
            onToggle={() => setHideCancelled(!hideCancelled)}
          >
            {cancelled.map((booking) => (
              <BookingRow
                key={booking._id}
                booking={booking}
                court={courtLabel(booking, courtNames)}
                onOpen={() => openRow(booking)}
              />
            ))}
          </FoldedList>
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
        <PageBody>
          {withWeather(
            <AnimatePresence mode="popLayout" initial={false}>
              {searching ? (
                <motion.div
                  key="search"
                  {...view("above")}
                  className="space-y-5"
                >
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
                      <section className="space-y-2">
                        <h2 className="text-muted-foreground px-1 text-[13px] font-medium">
                          {results.length}{" "}
                          {results.length === 1
                            ? "prenotazione"
                            : "prenotazioni"}
                        </h2>
                        <div className="space-y-3">
                          {results.map((booking) => (
                            <div key={booking._id} className="space-y-1">
                              <p className="text-muted-foreground px-1 text-xs font-medium">
                                {dayLabel(dayKey(booking.bookingDate), today)}
                              </p>
                              <BookingRow
                                booking={booking}
                                court={courtLabel(booking, courtNames)}
                                onOpen={() => openRow(booking)}
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                </motion.div>
              ) : (
                <motion.div
                  key="agenda"
                  {...view("below")}
                  className="space-y-6"
                >
                  {pending.length > 0 && (
                    <section className="space-y-2">
                      <h2 className="flex items-center gap-2 px-1 text-[13px] font-medium">
                        <span className="text-muted-foreground">
                          Da confermare
                        </span>
                        <CountBadge count={pending.length} />
                      </h2>
                      <div className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
                        {pending.map((booking) => (
                          <PendingCard
                            key={booking._id}
                            booking={booking}
                            court={courtLabel(booking, courtNames)}
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
                    {/* Da chiusa la striscia, o il ritorno a oggi; aperta, il
                      mese intero (solo da telefono). */}
                    <DayNavigator
                      expanded={calendarOpen}
                      selected={pastDay ?? selectedDay}
                      lastDay={days[days.length - 1] ?? today}
                      booked={[...marks.keys()]}
                      onPick={goToDay}
                    >
                      {pastDay ? (
                        <Button
                          variant="secondary"
                          className="h-10 rounded-full"
                          onClick={() => {
                            setPastDay(null);
                            setSelectedDay(today);
                          }}
                        >
                          <ArrowLeft className="size-4" />
                          Torna a oggi
                        </Button>
                      ) : (
                        <DayStrip
                          days={days}
                          selected={selectedDay}
                          onSelect={setSelectedDay}
                          marks={marks}
                          closed={closedDays}
                        />
                      )}
                    </DayNavigator>

                    <div className="lg:hidden">
                      <WeatherWidget {...weather} />
                    </div>

                    {pastDay ? (
                      past.rows === undefined ? (
                        <div className="space-y-2.5">
                          <Skeleton className="h-16 w-full rounded-2xl" />
                          <Skeleton className="h-16 w-full rounded-2xl" />
                        </div>
                      ) : (
                        renderDay(pastDay, past.rows ?? [])
                      )
                    ) : (
                      <DayPager
                        swipe={swipe}
                        days={days}
                        selected={selectedDay}
                        onSelect={setSelectedDay}
                        renderDay={renderDay}
                      />
                    )}
                  </section>
                </motion.div>
              )}
            </AnimatePresence>,
          )}
        </PageBody>
      </div>

      <BookingSheet
        booking={open}
        partner={open ? mergedPartnerOf(open, list) : undefined}
        court={open ? courtLabel(open, courtNames) : undefined}
        busy={open ? busyId === open._id : false}
        onOpenChange={(next) => {
          if (!next) {
            setOpenId(null);
            // Una modifica fatta dalla scheda si vede anche nel giorno passato.
            past.reload();
          }
        }}
        onAccept={(booking) => void askAccept(booking)}
        onCancel={(booking) => void askCancel(booking)}
        onRefund={(booking, paymentId, amount) =>
          void askRefund(booking, paymentId, amount)
        }
        onUpdatePlayers={updatePlayers}
        onReschedule={reschedule}
        onMoveCourt={moveCourt}
        onUpdatePhone={updatePhone}
        onResendWhatsapp={resendWhatsapp}
        onResendEmail={resendEmail}
        onNotifyMissing={(booking, names) =>
          void askNotifyMissing(booking, names)
        }
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

/** La forma della pagina mentre arriva: striscia dei giorni e schede. */
function AgendaSkeleton() {
  return (
    <div className="space-y-6">
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
      {/* Schede separate come quelle vere: arrivati i dati, niente salta. */}
      <div className="space-y-2.5">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: segnaposto senza identità.
            key={index}
            className="bg-card flex items-center gap-4 rounded-2xl border px-4 py-3.5"
          >
            <Skeleton className="h-9 w-12" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Un elenco in fondo alla giornata, che si richiude: le concluse, le
 * annullate. La giornata si legge senza, e chi le cerca le trova.
 */
function FoldedList({
  id,
  title,
  count,
  hidden,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  count: number;
  hidden: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  if (count === 0) return null;

  return (
    <section className="space-y-2 pt-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-muted-foreground text-[13px] font-medium">
          {title} · {count}
        </h2>
        <button
          type="button"
          aria-expanded={!hidden}
          aria-controls={id}
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground focus-visible:text-foreground -my-2 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[13px] font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {hidden ? "Mostra" : "Nascondi"}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
              hidden && "-rotate-90",
            )}
          />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {!hidden && (
          <motion.div
            id={id}
            key="list"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: "auto",
              transition: { duration: UI_DURATION.enter, ease: EASE_OUT },
            }}
            exit={{
              opacity: 0,
              ...(reduce ? {} : { height: 0 }),
              transition: { duration: UI_DURATION.exit, ease: EASE_OUT },
            }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
