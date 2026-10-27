"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import {
  type MotionValue,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef } from "react";

import { CLUB, ClubLogo } from "@/components/brand/club-logo";
import { Reveal, Words } from "@/components/motion/reveal";
import { headingVariants } from "@/components/site/heading";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FACTS = [
  {
    title: "In uso ogni giorno",
    body: "Lo staff del club ci gestisce agenda, clienti e prenotazioni.",
  },
  {
    title: "Nato da problemi veri",
    body: "Ogni funzione risponde a una richiesta arrivata al bancone.",
  },
  {
    title: "Migliora di continuo",
    body: "Le novità arrivano ogni settimana, senza installare niente.",
  },
] as const;

/**
 * Da dove viene Vetro: un club vero, con il suo nome e il suo marchio.
 *
 * È la prova più semplice che il gestionale funziona: il club che l'ha
 * creato lo usa ogni giorno. Sul verde della scheda si disegnano, mentre si
 * scorre, le linee di un campo da padel: prima le pareti, poi la rete, poi
 * le linee del servizio.
 *
 * Da telefono la sezione è corta: titolo, una frase e la scheda del club. I
 * tre fatti restano al desktop.
 */
export function Origin() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.95", "center 0.5"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  const walls = useTransform(progress, [0, 0.6], [reduce ? 1 : 0, 1]);
  const net = useTransform(progress, [0.35, 0.75], [reduce ? 1 : 0, 1]);
  const lines = useTransform(progress, [0.55, 1], [reduce ? 1 : 0, 1]);

  return (
    <section className="relative overflow-x-clip py-24 sm:py-36">
      <div className="page-container">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center lg:gap-20">
          <div>
            <h2
              className={cn(
                headingVariants({ size: "section" }),
                "max-w-[15ch]",
              )}
            >
              <Words
                lead="Nato in un club,"
                accent="non in un ufficio."
                accentClassName="text-brand"
              />
            </h2>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-muted-foreground">
                Vetro è nato dentro {CLUB.name}, per risolvere i problemi di un
                club di padel uno alla volta. Lo staff lo apre ogni mattina, ed
                è da lì che arriva ogni novità.
              </p>
            </Reveal>
          </div>

          <div ref={ref} className="max-lg:frame-bleed">
            <Reveal delay={0.15}>
              <ClubCard walls={walls} net={net} lines={lines} />
            </Reveal>
          </div>
        </div>

        <ul className="mt-20 hidden grid-cols-3 divide-x divide-border lg:grid">
          {FACTS.map((fact, index) => (
            <li key={fact.title} className="px-8 first:pl-0">
              <Reveal delay={index * 0.06}>
                <p className="text-[17px] font-semibold">{fact.title}</p>
                <p className="mt-1.5 max-w-[30ch] text-[15px] leading-relaxed text-muted-foreground">
                  {fact.body}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * La scheda del club: il suo logo in grande, nel verde del club, con il
 * nome, la città e il link al suo sito.
 *
 * Il tasto in basso (raggio 24) sta a 24px dai lati e dal fondo, e il
 * raggio della scheda è la somma: 48, come le altre schede grandi.
 */
function ClubCard({ walls, net, lines }: CourtProgress) {
  return (
    <article className="tone-club concentric relative isolate overflow-hidden shadow-frame [--inner:1.5rem] [--pad:1.5rem]">
      <CourtLines walls={walls} net={net} lines={lines} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(90%_60%_at_100%_0%,oklch(0.42_0.08_165/80%),transparent_70%),radial-gradient(70%_50%_at_0%_100%,oklch(0.22_0.045_165),transparent_70%)]"
      />

      <p className="px-1 text-[13px] font-medium text-muted-foreground">
        Il club dove è nato Vetro
      </p>

      <ClubLogo className="mt-8 h-24 w-auto text-white sm:h-28" />

      <div className="mt-8 px-1">
        <p className="font-display text-[1.9rem] leading-tight text-balance">
          {CLUB.name}
        </p>
        <p className="mt-1 text-[15px] text-muted-foreground">{CLUB.city}</p>
        {/* Uno stato vero: il club usa il gestionale adesso. È l'unico
            punto che pulsa nella sezione. */}
        <p className="mt-4 flex items-center gap-2 text-[14px]">
          <span className="relative grid size-2 place-content-center">
            <span className="live-ping absolute inset-0 rounded-full bg-mint" />
            <span className="size-2 rounded-full bg-mint" />
          </span>
          Usa Vetro ogni giorno
        </p>
      </div>

      <a
        href={CLUB.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full")}
      >
        Visita {CLUB.host}
        <ArrowUpRightIcon
          aria-hidden
          weight="bold"
          className="transition-transform duration-200 ease-(--ease-out) group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
        />
      </a>
    </article>
  );
}

interface CourtProgress {
  walls: MotionValue<number>;
  net: MotionValue<number>;
  lines: MotionValue<number>;
}

/**
 * Le linee del campo sul verde della scheda. Sono elementi veri e non un
 * SVG stirato: restano dritte e sottili a qualsiasi proporzione. Il bordo è
 * concentrico alla scheda (12px dentro, raggio 48 - 12). La rete è nel menta
 * del marchio; le altre linee si vedono appena, per non disturbare il testo.
 */
function CourtLines({ walls, net, lines }: CourtProgress) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-3 -z-10">
      <motion.div
        style={{ opacity: walls }}
        className="absolute inset-0 rounded-[36px] border border-white/10"
      />
      <motion.div
        style={{ scaleX: net }}
        className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-mint/35"
      />
      <motion.div
        style={{ scaleX: lines, originX: 0 }}
        className="absolute inset-x-0 top-[24%] h-px bg-white/10"
      />
      <motion.div
        style={{ scaleX: lines, originX: 1 }}
        className="absolute inset-x-0 top-[76%] h-px bg-white/10"
      />
      <motion.div
        style={{ scaleY: lines }}
        className="absolute top-[24%] bottom-[24%] left-1/2 w-px bg-white/10"
      />
    </div>
  );
}
