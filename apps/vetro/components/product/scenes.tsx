"use client";

import {
  CameraIcon,
  CheckIcon,
  CreditCardIcon,
  EnvelopeSimpleIcon,
  FlashlightIcon,
  StorefrontIcon,
} from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/brand/logo";
import { BLUR, DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { Initials, StatusBadge, Surface } from "./primitives";
import { useSequence } from "./use-sequence";

/**
 * Le scene di «Come funziona»: una giornata al club, un momento per scena.
 *
 * Ognuna è un pezzo vero del prodotto (la notifica allo staff, la
 * prenotazione dal telefono, l'assegnazione del campo, gli avvisi ai
 * giocatori) e si mette in moto da sola quando compare, una volta. Le
 * notifiche hanno i testi che il gestionale manda davvero.
 */

const enter = {
  initial: {
    opacity: 0,
    filter: BLUR.reveal,
    transform: "translateY(-14px) scale(0.98)",
  },
  animate: {
    opacity: 1,
    filter: BLUR.none,
    transform: "translateY(0px) scale(1)",
  },
  transition: { duration: DURATION.scene + 0.1, ease: EASE_OUT },
} as const;

/* ── Il telefono dello staff ─────────────────────────────── */

function LockScreen({
  time,
  date,
  children,
}: {
  time: string;
  date: string;
  children: ReactNode;
}) {
  return (
    <div className="relative mx-auto flex h-full w-full max-w-[22rem] flex-col items-center overflow-hidden rounded-[46px] border-[6px] border-zinc-900 bg-[radial-gradient(120%_70%_at_50%_0%,oklch(0.42_0.08_165),oklch(0.22_0.04_165)_60%,oklch(0.16_0.02_165))] px-4 pt-14 text-white shadow-frame">
      <p className="text-sm font-medium text-white/75">{date}</p>
      <p className="mt-1 text-[4.5rem] leading-none font-semibold tracking-tight tabular-nums">
        {time}
      </p>
      <div className="mt-10 flex w-full flex-col gap-2">{children}</div>
      {/* Torcia, fotocamera e la barra della Home: si riconosce il telefono
          prima ancora di leggere la notifica. I due tasti (raggio 22) stanno
          a 18px dal bordo e dal fondo: 22 + 18 fa i 40 dello schermo, e le
          curve si seguono come su iOS. */}
      <div
        aria-hidden
        className="absolute inset-x-[18px] bottom-[18px] flex items-center justify-between"
      >
        <span className="grid size-11 place-content-center rounded-full bg-white/14 backdrop-blur-xl">
          <FlashlightIcon weight="fill" className="size-5" />
        </span>
        <span className="grid size-11 place-content-center rounded-full bg-white/14 backdrop-blur-xl">
          <CameraIcon weight="fill" className="size-5" />
        </span>
      </div>
      <span
        aria-hidden
        className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-white/70"
      />
    </div>
  );
}

function Notification({
  title,
  body,
  when = "ora",
}: {
  title: string;
  body: ReactNode;
  when?: string;
}) {
  return (
    <motion.div
      {...enter}
      className="rounded-[22px] border border-white/15 bg-white/14 p-3 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-content-center rounded-[10px] bg-white text-zinc-900">
          <LogoMark className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[13px] font-semibold">{title}</p>
            <span className="shrink-0 text-[11px] text-white/60">{when}</span>
          </div>
          <div className="mt-0.5 text-[13px] leading-snug text-white/85">
            {body}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const EMPTY_DAYS_TIMES = [500] as const;

/** 09:00. Il promemoria dei giorni vuoti, con il tempo di riempirli. */
export function EmptyDaysScene() {
  const step = useSequence(EMPTY_DAYS_TIMES);
  return (
    <LockScreen time="09:00" date="Giovedì 29 ottobre">
      {step >= 1 && (
        <Notification
          title="Giorni ancora senza partite"
          body="Venerdì 30, sabato 31 e domenica 1 non hanno ancora partite in agenda."
        />
      )}
    </LockScreen>
  );
}

const REMINDER_TIMES = [500] as const;

/** 19:20. Il promemoria prima della partita: luci accese, campo aperto. */
export function ReminderScene() {
  const step = useSequence(REMINDER_TIMES);
  return (
    <LockScreen time="19:20" date="Sabato 31 ottobre">
      {step >= 1 && (
        <Notification
          title="2 partite alle 19:30, fra 10 minuti"
          body={
            <>
              Campo 1 · Chiara Amato
              <br />
              Campo 2 · Giulia Ferraro
            </>
          }
        />
      )}
    </LockScreen>
  );
}

/* ── Il telefono del giocatore ───────────────────────────── */

const SLOTS = ["18:00", "19:30", "21:00", "22:30"] as const;
const BOOKING_TIMES = [500, 1100, 1700, 2500] as const;

/**
 * 11:40. Il giocatore prenota da solo: giorno, ora, compagni e, se vuole,
 * il pagamento online. La pillola della selezione scivola da un orario
 * all'altro invece di sparire e ricomparire: si vede che è la stessa scelta
 * che cambia.
 */
export function BookingScene() {
  const step = useSequence(BOOKING_TIMES);
  const slot = step >= 1 ? "19:30" : "18:00";
  const online = step >= 2;
  const pressed = step === 3;
  const sent = step >= 4;

  return (
    // Il tasto in fondo ha sotto lo stesso margine che ha ai lati (16px).
    // Le spaziature fra i blocchi sono strette quanto basta perché la scena
    // entri anche nel palco più basso delle storie, da telefono: lì un pixel
    // in più tagliava il fondo e il tasto toccava il bordo.
    <div className="mx-auto flex h-full w-full max-w-[22rem] flex-col overflow-hidden rounded-[46px] border-[6px] border-zinc-900 bg-background px-4 pt-8 pb-4 shadow-frame">
      <p className="text-xs font-medium text-muted-foreground">
        Prenota un campo
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight">
        Sabato 31 ottobre
      </p>

      <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">
        Orario
      </p>
      {/*
       * Una pillola sola, che scorre sotto gli orari con una transizione CSS.
       * Non un `layoutId`: da telefono questa scena esiste due volte (sotto
       * il testo e nel palco del desktop, nascosto), e il layout condiviso
       * spostava la pillola nella copia invisibile, lasciando l'orario
       * scelto bianco su bianco. Gli strati sono fondo degli orari, pillola,
       * testo: per questo la pillola sta a z-1 e le etichette a z-2.
       */}
      <div className="relative isolate grid grid-cols-4 gap-1.5">
        {SLOTS.map((time) => {
          const taken = time === "22:30";
          return (
            <span
              key={time}
              className={cn(
                "grid h-10 place-content-center rounded-xl border text-sm font-medium tabular-nums",
                taken
                  ? "border-dashed border-border text-muted-foreground/60 line-through"
                  : "border-border bg-card",
              )}
            >
              <span
                className={cn(
                  "relative z-[2] transition-colors duration-300",
                  slot === time && "text-primary-foreground",
                )}
              >
                {time}
              </span>
            </span>
          );
        })}
        <span
          aria-hidden
          className="absolute top-0 left-0 z-[1] h-10 w-[calc((100%-3*0.375rem)/4)] rounded-xl bg-primary transition-transform duration-[450ms] ease-(--ease-in-out) motion-reduce:transition-none"
          style={{
            transform: `translateX(calc(${SLOTS.indexOf(slot)} * (100% + 0.375rem)))`,
          }}
        />
      </div>

      <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">
        Giocatori
      </p>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {[
            "Giulia Ferraro",
            "Sara Privitera",
            "Luca Spadaro",
            "Elena Fichera",
          ].map((name) => (
            <Initials
              key={name}
              name={name}
              className="ring-2 ring-background"
            />
          ))}
        </div>
        <span className="text-[13px] text-muted-foreground">Tu e altri 3</span>
      </div>

      <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">
        Pagamento
      </p>
      <div className="relative grid grid-cols-2 rounded-xl bg-muted p-1 text-[13px] font-medium">
        <motion.span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-sm bg-card shadow-[0_1px_3px_oklch(0_0_0/10%)]"
          animate={{
            transform: online ? "translateX(0%)" : "translateX(100%)",
          }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
        />
        <span className="relative flex h-9 items-center justify-center gap-1.5">
          <CreditCardIcon className="size-4" aria-hidden />
          Online, adesso
        </span>
        <span className="relative flex h-9 items-center justify-center gap-1.5">
          <StorefrontIcon className="size-4" aria-hidden />
          In struttura
        </span>
      </div>

      <div className="mt-auto pt-4">
        <div className="mb-3 flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Totale per 4</span>
          <span className="font-semibold tabular-nums">40,00 €</span>
        </div>
        <span
          className={cn(
            "relative flex h-12 items-center justify-center overflow-hidden rounded-full bg-primary text-[15px] font-medium text-primary-foreground",
            "transition-transform duration-150 ease-(--ease-out)",
            pressed && "scale-[0.97]",
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={sent ? "sent" : "cta"}
              initial={{
                opacity: 0,
                filter: BLUR.soft,
                transform: "translateY(8px)",
              }}
              animate={{
                opacity: 1,
                filter: BLUR.none,
                transform: "translateY(0px)",
              }}
              exit={{
                opacity: 0,
                filter: BLUR.soft,
                transform: "translateY(-8px)",
              }}
              transition={{ duration: DURATION.ui, ease: EASE_OUT }}
              className="flex items-center gap-1.5"
            >
              {sent ? (
                <>
                  <CheckIcon className="size-4" weight="bold" aria-hidden />
                  Richiesta inviata
                </>
              ) : (
                "Paga e prenota"
              )}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
    </div>
  );
}

/* ── L'agenda dello staff ─────────────────────────────────── */

/** Le ore della griglia dei campi: dalle 17 alle 23, 6 ore. */
const HOURS = ["17", "18", "19", "20", "21", "22", "23"];

/**
 * Dove sta una partita sulla riga del campo. I blocchi vivono dentro
 * un'area rientrata di 2px ai lati e si accorciano di 2px per parte: così
 * stanno a 4px dal bordo della riga su tutti i lati, come sopra e sotto, e
 * due partite una dopo l'altra restano separate da 4px invece di toccarsi.
 */
const span = (from: number, to: number) => ({
  left: `calc(${((from - 17) / 6) * 100}% + 2px)`,
  width: `calc(${((to - from) / 6) * 100}% - 4px)`,
});

const COURTS: { name: string; blocks: [number, number, string][] }[] = [
  {
    name: "Campo 1",
    blocks: [
      [18, 19.5, "Russo"],
      [19.5, 21, "Amato"],
      [21, 22.5, "Caruso"],
    ],
  },
  {
    name: "Campo 2",
    blocks: [
      [18, 19.5, "Greco"],
      [21, 22.5, "Messina"],
    ],
  },
  {
    name: "Campo 3",
    blocks: [
      [17, 18.5, "Lo Presti"],
      [21, 22.5, "Spadaro"],
    ],
  },
];

const CONFIRM_TIMES = [600, 1500, 2300] as const;

/**
 * 11:41. Lo staff conferma e il campo lo sceglie Vetro: quello dove la
 * partita chiude un buco invece di aprirne uno. La prenotazione arriva
 * sospesa sopra la griglia e scende nel posto libero del Campo 2.
 */
export function ConfirmScene() {
  const step = useSequence(CONFIRM_TIMES);
  const placed = step >= 2;
  const confirmed = step >= 3;

  return (
    <div className="flex h-full w-full flex-col justify-center gap-4">
      <Surface className="concentric [--inner:1rem] [--pad:1rem]">
        {/* Il badge è centrato sulle due righe del titolo: non sta
            nell'angolo, e non chiede un raggio suo. */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">
              Giulia Ferraro e altri 3
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Sabato 31 · 19:30-21:00 · Intermedio
            </p>
          </div>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={confirmed ? "ok" : "wait"}
              initial={{ opacity: 0, filter: BLUR.soft }}
              animate={{ opacity: 1, filter: BLUR.none }}
              exit={{ opacity: 0, filter: BLUR.soft }}
              transition={{ duration: DURATION.ui, ease: EASE_OUT }}
            >
              {confirmed ? (
                <StatusBadge tone="success" icon={CheckIcon}>
                  Confermata
                </StatusBadge>
              ) : (
                <StatusBadge tone="warning">Da confermare</StatusBadge>
              )}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="flex h-8 items-center justify-center rounded-full border border-border text-sm font-medium">
            Rifiuta
          </span>
          <span
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-medium text-primary-foreground",
              "transition-transform duration-150 ease-(--ease-out)",
              step === 1 && "scale-[0.97]",
            )}
          >
            <CheckIcon className="size-4" weight="bold" aria-hidden />
            Conferma
          </span>
        </div>
      </Surface>

      <Surface className="concentric [--inner:0.75rem] [--pad:1.25rem]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-medium">Campi di sabato</p>
          <AnimatePresence>
            {placed && (
              <motion.span
                initial={{
                  opacity: 0,
                  filter: BLUR.soft,
                  transform: "translateX(6px)",
                }}
                animate={{
                  opacity: 1,
                  filter: BLUR.none,
                  transform: "translateX(0px)",
                }}
                transition={{ duration: DURATION.ui, ease: EASE_OUT }}
              >
                <StatusBadge tone="info">Campo 2 · nessun buco</StatusBadge>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="mb-1.5 ml-16 flex justify-between px-0.5 text-[10px] text-muted-foreground tabular-nums">
          {HOURS.map((hour) => (
            <span key={hour} className="w-0 text-center">
              {hour}
            </span>
          ))}
        </div>

        <div className="relative flex flex-col gap-2">
          {COURTS.map((court) => (
            <div key={court.name} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[12px] text-muted-foreground">
                {court.name}
              </span>
              <div className="relative h-9 flex-1 rounded-lg bg-muted">
                <div className="absolute inset-x-0.5 inset-y-1">
                  {court.blocks.map(([from, to, label]) => (
                    <span
                      key={label}
                      style={span(from, to)}
                      className="absolute inset-y-0 grid place-content-center rounded-sm border border-border bg-card px-1 text-[11px] text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
                  {court.name === "Campo 2" && (
                    <motion.span
                      style={span(19.5, 21)}
                      initial={false}
                      animate={
                        placed
                          ? {
                              opacity: 1,
                              transform: "translateY(0px)",
                              filter: BLUR.none,
                            }
                          : {
                              opacity: 0.9,
                              transform: "translateY(-46px)",
                              filter: BLUR.none,
                            }
                      }
                      transition={{
                        type: "spring",
                        duration: 0.6,
                        bounce: 0.12,
                      }}
                      className={cn(
                        "absolute inset-y-0 z-10 grid place-content-center rounded-sm px-1 text-[11px] font-semibold transition-colors duration-300",
                        placed
                          ? "bg-primary text-primary-foreground"
                          : "border border-dashed border-warning bg-warning-subtle text-warning-foreground",
                      )}
                    >
                      Ferraro
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

/* ── Gli avvisi ai giocatori ──────────────────────────────── */

const PLAYERS = [
  "Giulia Ferraro",
  "Sara Privitera",
  "Luca Spadaro",
  "Elena Fichera",
];
const NOTIFIED_TIMES = [500, 900, 1150, 1400, 1650] as const;

/**
 * 11:42. La conferma arriva a chi ha prenotato e a ogni compagno collegato,
 * senza che lo staff scriva a nessuno. Le spunte si accendono una dopo
 * l'altra, come arrivano.
 */
export function NotifiedScene() {
  const step = useSequence(NOTIFIED_TIMES);

  return (
    <div className="flex h-full w-full flex-col justify-center gap-4">
      {step >= 1 && (
        <motion.div {...enter}>
          <Surface className="overflow-hidden rounded-[28px]">
            <div className="flex items-center gap-3 border-b border-border p-3">
              <span className="grid size-8 place-content-center rounded-full bg-brand-soft text-brand">
                <EnvelopeSimpleIcon
                  className="size-4"
                  weight="bold"
                  aria-hidden
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">
                  Prenotazione confermata
                </p>
                <p className="truncate text-[12px] text-muted-foreground">
                  Padel Club Riviera
                </p>
              </div>
            </div>
            <div className="p-3">
              <p className="font-display text-[1.75rem] leading-tight">
                Sabato 31, alle 19:30.
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Campo 2 · 4 giocatori · 90 minuti
              </p>
              <span className="mt-4 inline-flex h-8 items-center rounded-full border border-border px-4 text-[13px] font-medium">
                Aggiungi al calendario
              </span>
            </div>
          </Surface>
        </motion.div>
      )}

      <Surface className="divide-y divide-border rounded-[28px]">
        {PLAYERS.map((name, i) => {
          const done = step >= i + 2;
          return (
            <div key={name} className="flex items-center gap-3 p-3">
              <Initials name={name} />
              <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
              <span className="relative grid h-6 w-24 justify-items-end">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={done ? "done" : "wait"}
                    initial={{
                      opacity: 0,
                      filter: BLUR.soft,
                      transform: "scale(0.96)",
                    }}
                    animate={{
                      opacity: 1,
                      filter: BLUR.none,
                      transform: "scale(1)",
                    }}
                    exit={{
                      opacity: 0,
                      filter: BLUR.soft,
                      transform: "scale(0.96)",
                    }}
                    transition={{ duration: DURATION.ui, ease: EASE_OUT }}
                  >
                    {done ? (
                      <StatusBadge tone="success" icon={CheckIcon}>
                        Avvisato
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">In invio</StatusBadge>
                    )}
                  </motion.span>
                </AnimatePresence>
              </span>
            </div>
          );
        })}
      </Surface>
    </div>
  );
}
