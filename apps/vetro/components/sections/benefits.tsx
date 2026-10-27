"use client";

import {
  BellSimpleRingingIcon,
  CalendarCheckIcon,
  ChatsCircleIcon,
  CreditCardIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Words } from "@/components/motion/reveal";
import { headingVariants } from "@/components/site/heading";
import { ANCHORS } from "@/lib/brand";
import { BLUR, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Mode = "without" | "with";

const ROWS = [
  {
    icon: ChatsCircleIcon,
    topic: "Prenotazioni",
    without: "Arrivano in chat, anche a mezzanotte, e vanno ricopiate.",
    with: "Arrivano in agenda già complete di ora, campo e giocatori.",
  },
  {
    icon: SquaresFourIcon,
    topic: "Campi",
    without: "Li assegni a occhio, e in mezzo alla serata restano buchi.",
    with: "Vetro sceglie il campo che tiene la giornata compatta.",
  },
  {
    icon: BellSimpleRingingIcon,
    topic: "Conferme",
    without: "Scrivi a ogni giocatore, uno per uno.",
    with: "Ogni giocatore riceve la conferma da solo.",
  },
  {
    icon: CreditCardIcon,
    topic: "Pagamenti",
    without: "Ricordi a memoria chi ha già pagato.",
    with: "Vedi chi ha pagato online e cosa resta da incassare.",
  },
  {
    icon: CalendarCheckIcon,
    topic: "Giorni vuoti",
    without: "Te ne accorgi quando ormai è tardi.",
    with: "Un avviso te li segnala con tre giorni di anticipo.",
  },
] as const;

const TABS: { mode: Mode; label: string }[] = [
  { mode: "without", label: "Senza Vetro" },
  { mode: "with", label: "Con Vetro" },
];

/**
 * I vantaggi come confronto: la stessa giornata senza e con Vetro.
 *
 * Si apre su «Senza», e la prima volta che la sezione è in vista passa da
 * sola a «Con», così il confronto si vede anche senza toccare niente. Da lì
 * in poi decide chi legge. Il selettore è il trucco delle schede con la
 * maschera: una seconda fila di etichette, già colorata, ritagliata sulla
 * scheda attiva. Il colore cambia esattamente dove passa il bordo, senza le
 * due tinte che si sovrappongono a metà transizione.
 */
export function Benefits() {
  const [mode, setMode] = useState<Mode>("without");
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView || touched) return;
    const timer = window.setTimeout(() => setMode("with"), 1400);
    return () => window.clearTimeout(timer);
  }, [inView, touched]);

  const choose = (next: Mode) => {
    setTouched(true);
    setMode(next);
  };

  return (
    <section id={ANCHORS.benefits} className="py-24 sm:py-32">
      <div className="page-container">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <h2 className={headingVariants({ size: "section" })}>
              <Words
                lead="La stessa giornata."
                accent="Un altro club."
                accentClassName="text-brand"
              />
            </h2>

            <div ref={ref} className="mt-8">
              <div
                role="tablist"
                aria-label="Confronto"
                className="relative inline-grid grid-cols-2 rounded-full border border-border bg-card p-1 shadow-[0_1px_2px_oklch(0_0_0/4%)]"
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.mode}
                    type="button"
                    role="tab"
                    aria-selected={mode === tab.mode}
                    onClick={() => choose(tab.mode)}
                    className="relative z-10 h-10 rounded-full px-5 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
                  >
                    {tab.label}
                  </button>
                ))}
                {/* La fila attiva: stesse etichette, colori pieni, ritagliata. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-1 z-20 grid grid-cols-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-[clip-path] duration-500 ease-(--ease-in-out) motion-reduce:transition-none"
                  style={{
                    clipPath:
                      mode === "without"
                        ? "inset(0 50% 0 0 round 999px)"
                        : "inset(0 0 0 50% round 999px)",
                  }}
                >
                  {TABS.map((tab) => (
                    <span
                      key={tab.mode}
                      className="grid h-10 place-content-center px-5"
                    >
                      {tab.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <ul role="tabpanel" aria-live="polite" className="flex flex-col">
            {ROWS.map((row, index) => (
              <li
                key={row.topic}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 border-t border-border py-6 first:border-t-0 first:pt-0 sm:grid-cols-[3rem_10rem_minmax(0,1fr)] sm:items-center sm:py-7"
              >
                <span
                  className={cn(
                    "row-span-2 grid size-11 place-content-center rounded-2xl transition-colors duration-500 sm:row-span-1 sm:size-12",
                    mode === "with"
                      ? "bg-brand-soft text-brand"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <row.icon aria-hidden weight="duotone" className="size-5.5" />
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {row.topic}
                </span>
                <span className="relative block min-h-[3.4rem] sm:min-h-[2.2rem]">
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={mode}
                      initial={
                        reduce
                          ? { opacity: 0 }
                          : {
                              opacity: 0,
                              filter: BLUR.reveal,
                              transform: "translateY(10px)",
                            }
                      }
                      animate={{
                        opacity: 1,
                        filter: BLUR.none,
                        transform: "translateY(0px)",
                      }}
                      exit={
                        reduce
                          ? { opacity: 0 }
                          : {
                              opacity: 0,
                              filter: BLUR.soft,
                              transform: "translateY(-8px)",
                              transition: { duration: 0.2, ease: EASE_OUT },
                            }
                      }
                      transition={{
                        duration: 0.5,
                        ease: EASE_OUT,
                        delay: reduce ? 0 : index * 0.05,
                      }}
                      className={cn(
                        "block font-display text-[1.6rem] leading-[1.15] text-balance sm:text-[1.9rem]",
                        mode === "without" && "text-foreground/55",
                      )}
                    >
                      {row[mode]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
