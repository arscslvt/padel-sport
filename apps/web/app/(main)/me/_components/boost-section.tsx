"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowDown,
  CalendarCheck,
  Check,
  CreditCard,
  Sparkles,
  Trophy,
  UserPlus,
} from "lucide-react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "motion/react";
import { useEffect, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EASE, VIEWPORT } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SectionTitle } from "./section-title";

/**
 * «Fai crescere i tuoi punti»: come si guadagnano, adesso che alcuni punti
 * arrivano da soli (modules/points/auto.ts).
 *
 * Una tile per modo di guadagnare, e solo per quelli accesi dal club
 * (modules/points/boosts.ts): la partita vinta, che carica la segreteria, e
 * le azioni automatiche. Ognuna dice quanto vale e a che punto è chi guarda,
 * così la sezione non è un volantino ma un cruscotto: «2 di 3 questa
 * settimana» spinge più di «gioca tre volte».
 *
 * Ogni movimento racconta la sua tile, una volta sola, quando entra in vista:
 * la pallina atterra sul campo della partita vinta, la settimana si riempie
 * fin dove si è arrivati, il pagamento online passa con un riflesso, i due
 * amici si avvicinano. I punti contano fino al valore. Le tile entrano in
 * cascata, perché si leggono in ordine. Con il movimento ridotto tutto compare
 * già fermo, al suo stato finale.
 */

export type Boosts = NonNullable<
  FunctionReturnType<typeof api.modules.points.boosts.default>
>;

/**
 * L'ingresso delle tile: dal basso, appena più piccole, e si posano. La
 * trasformazione è una stringa e non `y`/`scale`: così la fa la scheda grafica
 * e non perde fotogrammi mentre la pagina finisce di caricare i dati.
 */
const TILE: Variants = {
  hidden: { opacity: 0, transform: "translateY(18px) scale(0.97)" },
  show: {
    opacity: 1,
    transform: "translateY(0px) scale(1)",
    transition: { duration: 0.5, ease: EASE },
  },
};

/** Con il movimento ridotto le tile compaiono e basta: niente spostamenti. */
const TILE_REDUCED: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

const GRID: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export function BoostSection({ joined }: { joined: boolean }) {
  const boosts = useQuery(api.modules.points.boosts.default, {});

  if (boosts === undefined) return <BoostSkeleton />;
  if (!boosts) return null;

  return <BoostTiles boosts={boosts} joined={joined} />;
}

/** La sezione disegnata, dati in mano: separata dalla lettura per poterla provare. */
export function BoostTiles({
  boosts,
  joined,
}: {
  boosts: Boosts;
  joined: boolean;
}) {
  const reduce = Boolean(useReducedMotion());

  const tiles = layout(boosts);
  if (tiles.length === 0) return null;

  return (
    <section aria-labelledby="boost-title" className="space-y-5">
      <SectionTitle
        id="boost-title"
        title="Fai crescere i tuoi punti"
        action={
          <span className="bg-emerald-500/10 text-emerald-700 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium dark:text-emerald-300">
            <Sparkles aria-hidden className="size-3.5" />
            Novità
          </span>
        }
        description={
          joined
            ? "Oltre alle partite vinte, adesso alcuni obiettivi ti danno punti da soli, appena li raggiungi."
            : "Oltre alle partite vinte, adesso alcuni obiettivi danno punti da soli. Per riceverli aderisci al programma qui sopra."
        }
      />

      <motion.ul
        className="grid grid-cols-1 gap-3 md:grid-cols-6"
        variants={GRID}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
      >
        {tiles.map(({ key, span, render }) => (
          <motion.li
            key={key}
            variants={reduce ? TILE_REDUCED : TILE}
            className={cn("flex", span)}
          >
            {render(reduce)}
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

/**
 * Quali tile, e quanto larghe. Le coppie dividono una riga quando ci sono
 * entrambe e la prendono intera quando ne resta una: la griglia non ha mai
 * un buco.
 */
function layout(boosts: Boosts) {
  const tiles: {
    key: string;
    span: string;
    render: (reduce: boolean) => React.ReactNode;
  }[] = [];

  const { wonMatch, firstMatch, weekly, onlinePayment, referral } = boosts;

  if (wonMatch) {
    tiles.push({
      key: "won",
      span: firstMatch ? "md:col-span-4" : "md:col-span-6",
      render: (reduce) => <WonMatchTile {...wonMatch} reduce={reduce} />,
    });
  }
  if (firstMatch) {
    tiles.push({
      key: "first",
      span: wonMatch ? "md:col-span-2" : "md:col-span-6",
      render: (reduce) => <FirstMatchTile {...firstMatch} reduce={reduce} />,
    });
  }
  if (weekly) {
    tiles.push({
      key: "weekly",
      span: onlinePayment ? "md:col-span-3" : "md:col-span-6",
      render: (reduce) => <WeeklyTile {...weekly} reduce={reduce} />,
    });
  }
  if (onlinePayment) {
    tiles.push({
      key: "online",
      span: weekly ? "md:col-span-3" : "md:col-span-6",
      render: (reduce) => (
        <OnlinePaymentTile {...onlinePayment} reduce={reduce} />
      ),
    });
  }
  if (referral) {
    tiles.push({
      key: "referral",
      span: "md:col-span-6",
      render: (reduce) => <ReferralTile {...referral} reduce={reduce} />,
    });
  }

  return tiles;
}

// ---------------------------------------------------------------------------
// I pezzi comuni

/** Il fondo di ogni tile: stessa forma, colori diversi. */
function Surface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        // Si solleva appena sotto il puntatore. `hover:` in Tailwind vale solo
        // dove un puntatore c'è davvero: il tocco non lo attiva per sbaglio.
        "rounded-card relative flex w-full flex-col overflow-hidden p-5 transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * «+10», che conta fino al valore quando entra in vista: è il numero che deve
 * farsi notare, e un numero che si muove si nota.
 */
function Points({
  value,
  reduce,
  className,
}: {
  value: number;
  reduce: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const count = useMotionValue(reduce ? value : 0);
  const shown = useTransform(count, (latest) => `+${Math.round(latest)}`);

  useEffect(() => {
    if (reduce) {
      count.set(value);
      return;
    }
    if (!inView) return;
    const controls = animate(count, value, {
      duration: 0.8,
      ease: EASE,
      delay: 0.25,
    });
    return () => controls.stop();
  }, [inView, value, reduce, count]);

  return (
    <span
      className={cn(
        "font-display leading-none tracking-[-0.03em] tabular-nums",
        className,
      )}
    >
      <span className="sr-only">+{value} punti</span>
      <motion.span ref={ref} aria-hidden>
        {shown}
      </motion.span>
    </span>
  );
}

function Icon({
  icon: Glyph,
  className,
}: {
  icon: typeof Trophy;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-background/60 flex size-9 shrink-0 items-center justify-center rounded-full",
        className,
      )}
    >
      <Glyph className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}

/** Il traguardo già preso: un segno di spunta, non un altro numero. */
function Done({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-success-foreground mt-4 inline-flex items-center gap-1.5 text-sm font-medium",
        className,
      )}
    >
      <Check aria-hidden className="size-4" strokeWidth={2.25} />
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Le tile

/**
 * La partita vinta: il modo di sempre, e il più grande. È scura come la
 * tessera e porta lo stesso campo visto dall'alto; una pallina ci cade sopra
 * e rimbalza, una volta, per dire «in campo».
 */
function WonMatchTile({
  label,
  points,
  reduce,
}: {
  label: string;
  points: number;
  reduce: boolean;
}) {
  return (
    <Surface className="tone-ink min-h-52 justify-between">
      <Court />
      <motion.span
        aria-hidden
        className="absolute top-[38%] right-[24%] size-4 rounded-full bg-emerald-300 shadow-[0_6px_14px_-4px_oklch(0.8_0.15_160/0.6)] sm:right-[30%]"
        variants={
          reduce
            ? undefined
            : {
                hidden: { y: -90, opacity: 0, scale: 0.6 },
                show: {
                  y: 0,
                  opacity: 1,
                  scale: 1,
                  transition: {
                    type: "spring",
                    duration: 0.7,
                    bounce: 0.4,
                    delay: 0.35,
                  },
                },
              }
        }
      />

      <div className="relative flex items-start justify-between gap-4">
        <Icon icon={Trophy} />
        <Points value={points} reduce={reduce} className="text-6xl" />
      </div>

      <div className="relative mt-10 max-w-[30ch]">
        <h3 className="text-lg font-medium">Ogni {label.toLowerCase()}</h3>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Vinci in campo e la segreteria li aggiunge al tuo saldo quando
          registra il risultato.
        </p>
      </div>
    </Surface>
  );
}

/** Il campo dall'alto, come sulla tessera: è l'unico decoro della tile scura. */
function Court() {
  return (
    <div
      aria-hidden
      className="absolute top-1/2 -right-[10%] h-[150%] w-[55%] -translate-y-1/2 rotate-[-8deg] rounded-[6px] border border-white/[0.08]"
    >
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.08]" />
      <div className="absolute inset-y-[14%] left-[22%] w-px bg-white/[0.06]" />
      <div className="absolute inset-y-[14%] right-[22%] w-px bg-white/[0.06]" />
      <div className="absolute top-1/2 right-[22%] left-[22%] h-px bg-white/[0.06]" />
    </div>
  );
}

/**
 * La prima partita: un «1» enorme in filigrana, che entra crescendo dietro al
 * testo. Compare solo a chi non ha ancora mai prenotato (modules/points/boosts.ts).
 */
function FirstMatchTile({
  points,
  reduce,
}: {
  points: number;
  reduce: boolean;
}) {
  return (
    <Surface className="bg-card border min-h-52 justify-between">
      <motion.span
        aria-hidden
        className="font-display text-foreground/[0.07] pointer-events-none absolute right-6 -bottom-7 text-[9.5rem] leading-none select-none"
        variants={
          reduce
            ? undefined
            : {
                hidden: { opacity: 0, scale: 0.8, rotate: -6 },
                show: {
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                  transition: { duration: 0.7, ease: EASE, delay: 0.2 },
                },
              }
        }
      >
        1
      </motion.span>

      <div className="relative flex items-start justify-between gap-4">
        <Icon icon={Sparkles} className="bg-muted" />
        <Points value={points} reduce={reduce} className="text-5xl" />
      </div>

      <div className="relative mt-8">
        <h3 className="text-lg font-medium">Prima partita</h3>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Alla tua prima prenotazione confermata.
        </p>
      </div>
    </Surface>
  );
}

/**
 * Tre partite in settimana: tre segmenti, uno per partita, che si riempiono
 * in fila fin dove si è arrivati. È la tile verde, perché è quella da
 * rincorrere ogni settimana.
 */
function WeeklyTile({
  points,
  target,
  played,
  done,
  reduce,
}: {
  points: number;
  target: number;
  played: number;
  done: boolean;
  reduce: boolean;
}) {
  const left = target - played;

  return (
    <Surface className="tone-emerald bg-emerald-950 min-h-52 justify-between">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-emerald-400/10 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-4">
        <Icon icon={CalendarCheck} className="bg-white/10" />
        <Points value={points} reduce={reduce} className="text-5xl" />
      </div>

      <div className="relative mt-8">
        <h3 className="text-lg font-medium">
          {target} partite in una settimana
        </h3>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Da lunedì a domenica, prenotazioni confermate.
        </p>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={played}
          aria-label="Partite giocate questa settimana"
          className="mt-5 grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${target}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: target }, (_, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: i segmenti sono fissi.
              key={index}
              className="h-2 overflow-hidden rounded-full bg-white/10"
            >
              {index < played && (
                <motion.span
                  className="block h-full origin-left rounded-full bg-emerald-400"
                  variants={
                    reduce
                      ? undefined
                      : {
                          hidden: { scaleX: 0 },
                          show: {
                            scaleX: 1,
                            transition: {
                              type: "spring",
                              stiffness: 160,
                              damping: 24,
                              delay: 0.45 + index * 0.14,
                            },
                          },
                        }
                  }
                />
              )}
            </span>
          ))}
        </div>

        {done ? (
          // Sul verde scuro il verde dei successi non si leggerebbe.
          <Done className="text-emerald-300">
            Obiettivo raggiunto questa settimana
          </Done>
        ) : (
          <p className="mt-3 text-sm tabular-nums">
            <span className="font-medium">
              {played} di {target}
            </span>{" "}
            <span className="text-muted-foreground">
              questa settimana
              {played > 0
                ? `, ${left === 1 ? "ne manca una" : `ne mancano ${left}`}`
                : ""}
            </span>
          </p>
        )}
      </div>
    </Surface>
  );
}

/**
 * Il pagamento online: la carta ha un riflesso che le passa sopra, una volta,
 * come quando la si inclina alla luce.
 */
function OnlinePaymentTile({
  points,
  reduce,
}: {
  points: number;
  reduce: boolean;
}) {
  return (
    <Surface className="bg-muted min-h-52 justify-between">
      <div className="relative flex items-start justify-between gap-4">
        <span className="relative overflow-hidden rounded-full">
          <Icon icon={CreditCard} className="bg-background" />
          {!reduce && (
            <motion.span
              aria-hidden
              className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
              variants={{
                hidden: { x: "-60%" },
                show: {
                  x: "320%",
                  transition: { duration: 0.9, ease: EASE, delay: 0.6 },
                },
              }}
            />
          )}
        </span>
        <Points value={points} reduce={reduce} className="text-5xl" />
      </div>

      <div className="relative mt-8">
        <h3 className="text-lg font-medium">Paghi online</h3>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          A ogni prenotazione che paghi dal sito, al momento del pagamento.
        </p>
      </div>
    </Surface>
  );
}

/**
 * L'amico invitato: due cerchi che si avvicinano fino a toccarsi, tu e chi
 * inviti. È la sola tile con un'azione, perché è il solo obiettivo che si
 * comincia da qui: porta al modulo d'invito, poco più sotto.
 */
function ReferralTile({
  points,
  friendPoints,
  invited,
  rewarded,
  reduce,
}: {
  points: number;
  friendPoints: number | null;
  invited: number;
  rewarded: number;
  reduce: boolean;
}) {
  const meet = (from: number): Variants | undefined =>
    reduce
      ? undefined
      : {
          hidden: { x: from, opacity: 0 },
          show: {
            x: 0,
            opacity: 1,
            transition: {
              type: "spring",
              duration: 0.6,
              bounce: 0.3,
              delay: 0.3,
            },
          },
        };

  return (
    <Surface className="bg-card border gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-5">
        <div aria-hidden className="flex shrink-0 items-center">
          <motion.span
            variants={meet(-18)}
            className="bg-foreground text-background flex size-12 items-center justify-center rounded-full text-sm font-medium"
          >
            Tu
          </motion.span>
          <motion.span
            variants={meet(18)}
            className="-ml-2 flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-[var(--card)]"
          >
            <UserPlus className="size-5" strokeWidth={1.75} />
          </motion.span>
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-medium">Inviti un amico</h3>
          <p className="text-muted-foreground mt-1 max-w-[46ch] text-sm leading-relaxed">
            Quando si iscrive e paga la prima tessera
            {friendPoints
              ? `, ricevi ${points} punti e chi inviti ne riceve ${friendPoints} di benvenuto.`
              : `, ricevi ${points} punti.`}
          </p>
          {invited > 0 && (
            <p className="mt-2 text-sm">
              {invited === 1
                ? "Hai invitato un amico"
                : `Hai invitato ${invited} amici`}
              {rewarded > 0 && (
                <span className="text-success-foreground">
                  , {rewarded === 1 ? "uno ti ha" : `${rewarded} ti hanno`} già
                  dato punti
                </span>
              )}
              .
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-3">
        <Points value={points} reduce={reduce} className="text-5xl" />
        <a
          href="#invite-title"
          className="bg-foreground text-background inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Invita un amico
          <ArrowDown aria-hidden className="size-4" />
        </a>
      </div>
    </Surface>
  );
}

function BoostSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <Skeleton className="rounded-card h-52 md:col-span-4" />
        <Skeleton className="rounded-card h-52 md:col-span-2" />
        <Skeleton className="rounded-card h-52 md:col-span-3" />
        <Skeleton className="rounded-card h-52 md:col-span-3" />
      </div>
    </div>
  );
}
