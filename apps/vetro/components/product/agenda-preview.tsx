"use client";

import {
  BellRingingIcon,
  CalendarDotsIcon,
  CheckIcon,
  CurrencyEurIcon,
  EnvelopeSimpleIcon,
  GearSixIcon,
  GiftIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SunIcon,
  TicketIcon,
  TrayIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import { LogoMark } from "@/components/brand/logo";
import {
  BOOKINGS,
  DAYS,
  DEMO_CLUB,
  DEMO_STAFF,
  type DemoBooking,
  INCOMING,
  LIVE_MATCH,
  TODAY_INDEX,
} from "@/lib/demo-data";
import { BLUR, DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { ProductFrame, StatusBadge, Surface } from "./primitives";

const NAV = [
  { label: "Agenda", icon: CalendarDotsIcon, count: 1, active: true },
  { label: "Richieste", icon: TrayIcon, count: 2 },
  { label: "Clienti", icon: UsersIcon },
  { label: "Punti e premi", icon: GiftIcon },
  { label: "Iscrizioni", icon: TicketIcon },
  { label: "Comunicazioni", icon: EnvelopeSimpleIcon },
  { label: "Listino", icon: CurrencyEurIcon },
  { label: "Configurazione", icon: GearSixIcon },
] as const;

/**
 * Il racconto dell'hero, in fasi.
 *
 * `idle` la giornata com'è. `toast` arriva la notifica. `pending` la
 * prenotazione entra in agenda, da confermare. `pressing` lo staff preme
 * Conferma. `done` è confermata, con il campo scelto da Vetro. Parte una
 * volta sola, quando l'agenda è in vista: è una spiegazione, non un
 * ornamento da ripetere.
 */
type Phase = "idle" | "toast" | "pending" | "pressing" | "done";

const TIMELINE: [Phase, number][] = [
  ["toast", 1100],
  ["pending", 1700],
  ["pressing", 3500],
  ["done", 3800],
];

const swap = {
  initial: { opacity: 0, filter: BLUR.soft, transform: "translateY(4px)" },
  animate: { opacity: 1, filter: BLUR.none, transform: "translateY(0px)" },
  exit: { opacity: 0, filter: BLUR.soft, transform: "translateY(-4px)" },
  transition: { duration: DURATION.ui, ease: EASE_OUT },
} as const;

export function AgendaPreview({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setPhase("done");
      return;
    }
    const timers = TIMELINE.map(([next, at]) =>
      window.setTimeout(() => setPhase(next), at),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [inView, reduce]);

  const showIncoming = phase !== "idle" && phase !== "toast";
  const toastVisible = phase === "toast" || phase === "pending";

  return (
    <ProductFrame className={cn("relative select-none", className)}>
      <div
        ref={ref}
        className="grid grid-cols-1 md:grid-cols-[13.5rem_minmax(0,1fr)]"
      >
        <Sidebar pendingCount={phase === "done" ? 0 : 1} />

        <div className="min-w-0 p-(--pad)">
          <header className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <h3 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                Buonasera, {DEMO_STAFF}
              </h3>
              <span className="hidden h-7 items-center gap-1.5 rounded-full border border-warning-border bg-warning-subtle px-2.5 text-xs text-warning-foreground sm:inline-flex">
                <SunIcon aria-hidden className="size-3.5" weight="bold" />
                19° · Sereno fino a sera
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="grid size-8 place-content-center rounded-full border border-border bg-card text-muted-foreground">
                <MagnifyingGlassIcon aria-hidden className="size-4" />
              </span>
              <span className="hidden h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground sm:inline-flex">
                <PlusIcon aria-hidden className="size-3.5" weight="bold" />
                Nuova prenotazione
              </span>
            </div>
          </header>

          <DayStrip pendingToday={phase !== "done"} />

          <section aria-label="Partite in corso" className="mt-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              In campo ora
            </p>
            <Surface className="flex items-center gap-4 px-4 py-3">
              <span className="relative grid size-2.5 place-content-center">
                <span className="live-ping absolute inset-0 rounded-full bg-success" />
                <span className="size-2.5 rounded-full bg-success" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {LIVE_MATCH.players}
                </span>
                <span className="block text-[13px] text-muted-foreground">
                  {LIVE_MATCH.court} · {LIVE_MATCH.start}-{LIVE_MATCH.end}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs text-success-foreground tabular-nums">
                52 min
              </span>
            </Surface>
          </section>

          <section aria-label="Partite di oggi" className="mt-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Sabato 31
            </p>
            <ul className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                <BookingItem key={BOOKINGS[0].id} booking={BOOKINGS[0]} />
                {showIncoming && (
                  <motion.li
                    key={INCOMING.id}
                    layout="position"
                    initial={{
                      opacity: 0,
                      filter: BLUR.reveal,
                      transform: "scale(0.97)",
                    }}
                    animate={{
                      opacity: 1,
                      filter: BLUR.none,
                      transform: "scale(1)",
                    }}
                    transition={{ duration: DURATION.scene, ease: EASE_OUT }}
                  >
                    <IncomingRow phase={phase} />
                  </motion.li>
                )}
                {BOOKINGS.slice(1).map((booking) => (
                  <BookingItem key={booking.id} booking={booking} />
                ))}
              </AnimatePresence>
            </ul>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {toastVisible && (
          <motion.div
            key="toast"
            aria-hidden
            initial={{
              opacity: 0,
              filter: BLUR.soft,
              transform: "translateY(-10px) scale(0.98)",
            }}
            animate={{
              opacity: 1,
              filter: BLUR.none,
              transform: "translateY(0px) scale(1)",
            }}
            // L'uscita è più rapida dell'entrata: il sistema ha già detto la
            // sua, non deve trattenere lo sguardo.
            exit={{
              opacity: 0,
              filter: BLUR.soft,
              transform: "translateY(-6px) scale(0.98)",
              transition: { duration: 0.2, ease: EASE_OUT },
            }}
            transition={{ duration: DURATION.scene, ease: EASE_OUT }}
            // Da telefono la notifica occupa la riga, come i banner di iOS;
            // da sm in su torna una scheda compatta nell'angolo.
            className="glass absolute inset-x-(--pad) top-(--pad) z-10 flex items-center gap-3 rounded-2xl p-2 pr-4 sm:right-(--pad) sm:left-auto sm:w-80"
          >
            <span className="grid size-8 shrink-0 place-content-center rounded-sm bg-brand-soft text-brand">
              <BellRingingIcon aria-hidden className="size-4" weight="fill" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold">
                Nuova prenotazione
              </span>
              <span className="block truncate text-[13px] text-muted-foreground">
                {INCOMING.owner} · oggi alle {INCOMING.start}
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </ProductFrame>
  );
}

function Sidebar({ pendingCount }: { pendingCount: number }) {
  return (
    <aside className="hidden border-r border-border bg-card p-(--pad) md:block">
      {/* Il logo del club è tondo (raggio 16) e sta a `--pad` dall'angolo
          della cornice: concentrico come i tasti dall'altra parte. */}
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-8 place-content-center rounded-full bg-club text-white [--brand:var(--mint)]">
          <LogoMark className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold">
            {DEMO_CLUB}
          </span>
          <span className="block text-[11px] text-muted-foreground">Staff</span>
        </span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {NAV.map(({ label, icon: Icon, ...item }) => {
          const count =
            label === "Agenda"
              ? pendingCount
              : "count" in item
                ? item.count
                : 0;
          return (
            <li
              key={label}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px]",
                "active" in item
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Icon aria-hidden className="size-4" />
              <span className="flex-1 truncate">{label}</span>
              <AnimatePresence initial={false}>
                {count > 0 && (
                  <motion.span
                    initial={{ opacity: 0, transform: "scale(0.6)" }}
                    animate={{ opacity: 1, transform: "scale(1)" }}
                    exit={{ opacity: 0, transform: "scale(0.6)" }}
                    transition={{ duration: DURATION.ui, ease: EASE_OUT }}
                    className="grid h-4.5 min-w-4.5 place-content-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white tabular-nums"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function DayStrip({ pendingToday }: { pendingToday: boolean }) {
  return (
    <ol className="mt-5 grid grid-cols-7 gap-1.5">
      {DAYS.map((day, index) => {
        const today = index === TODAY_INDEX;
        const pending = today ? pendingToday : day.pending;
        return (
          <li
            key={day.day}
            className={cn(
              "relative flex flex-col items-center rounded-xl py-2 text-center",
              today
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground/80",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium",
                today ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {day.short}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {day.day}
            </span>
            {/* Il puntino arancione del gestionale: c'è qualcosa da
                confermare. È uno stato vero, non un ornamento. */}
            <AnimatePresence initial={false}>
              {pending && (
                <motion.span
                  aria-label="Da confermare"
                  initial={{ opacity: 0, transform: "scale(0.5)" }}
                  animate={{ opacity: 1, transform: "scale(1)" }}
                  exit={{ opacity: 0, transform: "scale(0.5)" }}
                  transition={{ duration: DURATION.ui, ease: EASE_OUT }}
                  className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-warning"
                />
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ol>
  );
}

function BookingItem({ booking }: { booking: DemoBooking }) {
  return (
    <motion.li
      layout="position"
      transition={{ duration: DURATION.scene, ease: EASE_OUT }}
    >
      <BookingRow booking={booking} />
    </motion.li>
  );
}

export function BookingRow({ booking }: { booking: DemoBooking }) {
  return (
    <div>
      <Surface
        className={cn(
          "relative z-[1] flex items-center gap-4 px-4 py-3",
          booking.notice && "rounded-b-none",
        )}
      >
        <Times start={booking.start} end={booking.end} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {booking.players}
          </span>
          <span className="block truncate text-[13px] text-muted-foreground">
            {[booking.court, booking.seats, booking.level].join(" · ")}
          </span>
        </span>
        {booking.aside.kind === "badge" ? (
          <StatusBadge tone={booking.aside.tone}>
            {booking.aside.label}
          </StatusBadge>
        ) : (
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {booking.aside.label}
          </span>
        )}
      </Surface>
      {booking.notice && (
        <span className="flex flex-wrap gap-1.5 rounded-b-[20px] border border-t-0 border-border bg-muted p-2">
          <StatusBadge tone={booking.notice.tone}>
            {booking.notice.label}
          </StatusBadge>
        </span>
      )}
    </div>
  );
}

function Times({ start, end }: { start: string; end: string }) {
  return (
    <span className="w-11 shrink-0 text-right">
      <span className="block text-[15px] font-semibold tabular-nums">
        {start}
      </span>
      <span className="block text-xs text-muted-foreground tabular-nums">
        {end}
      </span>
    </span>
  );
}

/**
 * La prenotazione appena arrivata. Prima chiede una risposta, con il tasto a
 * portata come nel gestionale; poi diventa una riga come le altre, con il
 * campo che Vetro ha scelto. I due stati si scambiano con un velo di blur,
 * così si legge un'unica riga che cambia invece di due che si sovrappongono.
 */
function IncomingRow({ phase }: { phase: Phase }) {
  const done = phase === "done";

  return (
    <Surface
      className={cn(
        "relative flex items-center gap-4 px-4 py-3 transition-[border-color,box-shadow] duration-500 ease-(--ease-out)",
        !done &&
          "border-warning-border shadow-[0_0_0_3px_oklch(0.8_0.15_75/10%)]",
      )}
    >
      <Times start={INCOMING.start} end={INCOMING.end} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {INCOMING.players}
        </span>
        <span className="relative block h-[1.2rem] text-[13px] text-muted-foreground">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={done ? "court" : "nocourt"}
              {...swap}
              className="block truncate"
            >
              {done
                ? `${INCOMING.court} · ${INCOMING.seats} · ${INCOMING.level}`
                : `Campo da assegnare · ${INCOMING.seats} · ${INCOMING.level}`}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>

      <span className="relative flex shrink-0 justify-end">
        <AnimatePresence initial={false} mode="popLayout">
          {done ? (
            <motion.span key="paid" {...swap}>
              <StatusBadge tone="success" icon={CheckIcon}>
                Confermata
              </StatusBadge>
            </motion.span>
          ) : (
            <motion.span
              key="confirm"
              {...swap}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground",
                "transition-transform duration-150 ease-(--ease-out)",
                phase === "pressing" && "scale-[0.94]",
              )}
            >
              <CheckIcon aria-hidden className="size-3.5" weight="bold" />
              Conferma
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </Surface>
  );
}
