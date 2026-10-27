"use client";

import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowsLeftRightIcon,
  CheckIcon,
  HandCoinsIcon,
  LockSimpleIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import Link from "next/link";
import { type ReactNode, useRef, useState } from "react";
import { SumUpLogo } from "@/components/brand/sumup-logo";
import { Reveal, Words } from "@/components/motion/reveal";
import { Initials, StatusBadge } from "@/components/product/primitives";
import { useSequence } from "@/components/product/use-sequence";
import { headingVariants } from "@/components/site/heading";
import { ANCHORS, ROUTES } from "@/lib/brand";
import { BLUR, DURATION, EASE_OUT } from "@/lib/motion";
import { planName } from "@/lib/plans";
import { cn } from "@/lib/utils";

const FACTS = [
  {
    icon: HandCoinsIcon,
    title: "I soldi vanno a te",
    body: "Gli incassi arrivano sul conto SumUp del club. Vetro non trattiene niente.",
  },
  {
    icon: ShieldCheckIcon,
    title: "La carta resta su SumUp",
    body: "Il giocatore paga sulla pagina sicura di SumUp. Nessun dato della carta passa da Vetro.",
  },
  {
    icon: ArrowCounterClockwiseIcon,
    title: "Rimborsi decisi da te",
    body: "Annulli una partita e scegli se rimborsare. Il rimborso torna sulla carta usata.",
  },
  {
    icon: ArrowsLeftRightIcon,
    title: "Agenda sempre allineata",
    body: "Le prenotazioni prese su SumUp entrano in agenda, e SumUp vede le tue. Niente doppie prenotazioni.",
  },
] as const;

/**
 * L'integrazione con SumUp, per i club che lo usano già.
 *
 * Il percorso di un pagamento in tre tappe, dal sito del club al suo conto:
 * le tappe si accendono una dopo l'altra e la linea fra l'una e l'altra si
 * riempie, così si vede dove passano i soldi (e dove no: mai da Vetro).
 * Sotto, i quattro fatti che un gestore chiede prima di attivarlo. Tutto è
 * vero nel gestionale: Hosted Checkout di SumUp, rimborsi solo dallo staff,
 * calendario condiviso con SumUp ogni cinque minuti.
 */
export function SumUpSection() {
  return (
    <section id={ANCHORS.sumup} className="py-24 sm:py-32">
      <div className="page-container">
        <Reveal>
          {/* Il logo completo di SumUp, il primo della sezione: le regole del
              marchio vogliono che venga prima del simbolo da solo. */}
          <p className="mb-5 flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
            Funziona con
            <SumUpLogo className="h-6 w-auto text-foreground" />
          </p>
        </Reveal>
        <h2
          className={cn(headingVariants({ size: "section" }), "max-w-[16ch]")}
        >
          <Words
            lead="Usi già SumUp?"
            accent="Sei già pronto."
            accentClassName="text-brand"
            breakBeforeAccent
          />
        </h2>
        <Reveal delay={0.1}>
          <p className="mt-5 max-w-[48ch] text-[17px] leading-relaxed text-muted-foreground">
            Collega il tuo account SumUp. Le prenotazioni dal sito si pagano
            online, e i soldi arrivano direttamente a te.
          </p>
        </Reveal>

        <Reveal delay={0.12} className="mt-12 max-lg:frame-bleed lg:mt-16">
          <PaymentJourney />
        </Reveal>

        <dl className="mt-14 grid grid-cols-1 gap-x-14 gap-y-8 sm:grid-cols-2 lg:mt-16">
          {FACTS.map(({ icon: Icon, title, body }, index) => (
            <Reveal key={title} delay={index * 0.05} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-content-center rounded-full bg-brand-soft text-brand">
                <Icon aria-hidden weight="duotone" className="size-5" />
              </span>
              <div>
                <dt className="text-[16px] font-semibold">{title}</dt>
                <dd className="mt-1 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
                  {body}
                </dd>
              </div>
            </Reveal>
          ))}
        </dl>

        <Reveal className="mt-12">
          <p className="max-w-[60ch] text-[14px] leading-relaxed text-muted-foreground">
            Incluso nel piano {planName("complete")}. Il pagamento online è
            facoltativo, e chi preferisce paga in struttura. Le uniche
            commissioni sono quelle del tuo contratto SumUp.{" "}
            <Link
              href={ROUTES.pricing}
              className="rounded-sm font-medium text-foreground underline decoration-border underline-offset-4 outline-none transition-colors duration-160 hover:decoration-foreground focus-visible:ring-3 focus-visible:ring-ring"
            >
              Vedi i piani
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Il percorso di un pagamento ─────────────────────────── */

/**
 * I tempi delle tappe, in ms da quando il percorso è in vista: la pressione
 * del tasto, la linea verso SumUp, il pagamento riuscito, la linea verso il
 * club, l'accredito.
 */
const TIMES = [700, 1300, 2100, 2800, 3500] as const;

/** Oltre questo tempo la risalita si considera finita anche senza `scrollend`. */
const SCROLL_FALLBACK_MS = 900;

/**
 * Il percorso, con il suo «Rivedi».
 *
 * «Rivedi» riporta su la prima tappa, sotto la navigazione, e solo a
 * risalita finita fa ripartire la sequenza: chi guarda il tasto, in fondo al
 * percorso, non deve perdersi l'inizio. Il percorso torna subito allo stato
 * di partenza, rimontato con una chiave nuova, e aspetta fermo.
 */
function PaymentJourney() {
  const wrapper = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const [holding, setHolding] = useState(false);

  const replay = () => {
    const el = wrapper.current;
    setRun((n) => n + 1);
    if (!el) return;

    setHolding(true);
    let done = false;
    const release = () => {
      if (done) return;
      done = true;
      window.removeEventListener("scrollend", release);
      window.clearTimeout(timer);
      setHolding(false);
    };
    const timer = window.setTimeout(release, SCROLL_FALLBACK_MS);
    window.addEventListener("scrollend", release, { once: true });

    // Già in cima: niente da scorrere, e `scrollend` non arriverebbe.
    const top = el.getBoundingClientRect().top;
    const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    if (Math.abs(top - margin) < 4) {
      release();
      return;
    }
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    // `scroll-mt`: la prima tappa si ferma sotto la pillola di navigazione.
    <div ref={wrapper} className="scroll-mt-24 sm:scroll-mt-28">
      <Journey key={run} paused={holding} onReplay={replay} />
    </div>
  );
}

function Journey({
  paused,
  onReplay,
}: {
  /** Fermo allo stato di partenza: la pagina sta ancora risalendo. */
  paused: boolean;
  onReplay: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const step = useSequence(TIMES, inView && !paused);
  const active = step < 2 ? 0 : step < 4 ? 1 : 2;
  const finished = step >= TIMES.length;

  return (
    <div ref={ref}>
      {/* La cornice: le tappe (raggio 28) a `--pad` dal bordo, e il raggio
          esterno è la somma. */}
      <ol className="concentric grid grid-cols-1 border border-border bg-muted [--inner:1.75rem] [--pad:0.75rem] sm:[--pad:1.5rem] lg:grid-cols-3 lg:gap-12">
        <Station
          index={0}
          active={active === 0}
          reached
          line={step >= 2}
          title="Il giocatore paga dal sito"
          body="Prenota il campo e sceglie di pagare online, per sé e per i compagni."
        >
          <CheckoutCard pressed={step === 1} sent={step >= 2} />
        </Station>
        <Station
          index={1}
          active={active === 1}
          reached={step >= 2}
          line={step >= 4}
          title="Paga sulla pagina di SumUp"
          body="La carta la vede solo SumUp, come in cassa."
        >
          <SumUpCard paid={step >= 3} />
        </Station>
        <Station
          index={2}
          active={active === 2}
          reached={step >= 4}
          title="I soldi arrivano a te"
          body="Sul conto SumUp del club. In agenda la partita risulta già pagata."
        >
          <ClubCard credited={step >= 5} />
        </Station>
      </ol>

      <div className="mt-4 flex h-9 justify-center">
        <AnimatePresence>
          {finished && !reduce && (
            <motion.button
              type="button"
              onClick={onReplay}
              initial={{ opacity: 0, filter: BLUR.soft }}
              animate={{ opacity: 1, filter: BLUR.none }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.ui, ease: EASE_OUT }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium text-muted-foreground outline-none transition-[color,background-color,transform] duration-160 hover:bg-foreground/6 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.97]"
            >
              <ArrowClockwiseIcon
                aria-hidden
                weight="bold"
                className="size-4"
              />
              Rivedi
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Station({
  index,
  active,
  reached,
  line,
  title,
  body,
  children,
}: {
  index: number;
  active: boolean;
  reached: boolean;
  /** La linea verso la tappa dopo è piena. */
  line?: boolean;
  title: string;
  body: string;
  children: ReactNode;
}) {
  const last = index === 2;

  return (
    <li className="relative flex flex-col">
      <div
        className={cn(
          // Da telefono l'altezza è quella del contenuto, così le tre tappe
          // stanno in una schermata; da desktop sono alte uguali, affiancate.
          "concentric flex flex-col gap-4 border bg-card [--inner:1rem] [--pad:0.75rem] lg:h-56 lg:justify-between lg:gap-0",
          "transition-[border-color,box-shadow,opacity] duration-500 ease-(--ease-out)",
          active
            ? "border-brand/45 shadow-[0_0_0_4px_var(--brand-soft),0_12px_32px_-16px_oklch(0.29_0.055_165/35%)]"
            : "border-border shadow-[0_1px_2px_oklch(0_0_0/4%)]",
          !reached && "opacity-55",
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "px-1 pt-3 transition-opacity duration-500 lg:pt-4",
          !reached && "opacity-55",
        )}
      >
        <h3 className="text-[16px] font-semibold">{title}</h3>
        <p className="mt-0.5 text-[14px] leading-snug text-muted-foreground lg:mt-1">
          {body}
        </p>
      </div>

      {/* La linea verso la tappa dopo: in verticale da telefono, in
          orizzontale da desktop, a metà altezza delle schede. Si riempie
          dall'inizio alla fine, con la curva di ciò che si sposta. */}
      {!last && (
        <span
          aria-hidden
          className="relative mx-auto my-2 block h-6 w-0.5 overflow-hidden rounded-full bg-zinc-200 lg:absolute lg:top-28 lg:left-full lg:mx-0 lg:my-0 lg:h-0.5 lg:w-12"
        >
          <span
            className={cn(
              "absolute inset-0 origin-top rounded-full bg-brand lg:origin-left",
              "transition-[scale] duration-500 ease-(--ease-in-out) motion-reduce:transition-none",
              line ? "scale-100" : "scale-y-0 lg:scale-y-100 lg:scale-x-0",
            )}
          />
        </span>
      )}
    </li>
  );
}

const swap = {
  initial: { opacity: 0, filter: BLUR.soft, transform: "translateY(6px)" },
  animate: { opacity: 1, filter: BLUR.none, transform: "translateY(0px)" },
  exit: { opacity: 0, filter: BLUR.soft, transform: "translateY(-6px)" },
  transition: { duration: DURATION.ui, ease: EASE_OUT },
} as const;

/** Il riepilogo della prenotazione sul sito del club. */
function CheckoutCard({ pressed, sent }: { pressed: boolean; sent: boolean }) {
  return (
    <>
      <div className="px-1 pt-1">
        <p className="text-[12px] text-muted-foreground">Sabato 31 ottobre</p>
        <p className="text-[15px] font-semibold">19:30 · Campo 2</p>
        <div className="mt-3 hidden items-center gap-2 lg:flex">
          <div className="flex -space-x-1">
            {[
              "Giulia Ferraro",
              "Sara Privitera",
              "Luca Spadaro",
              "Elena Fichera",
            ].map((name) => (
              <Initials
                key={name}
                name={name}
                className="size-7 text-[10px] ring-2 ring-card"
              />
            ))}
          </div>
          <span className="text-[13px] text-muted-foreground">
            Tu e altri 3
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between text-[13px]">
          <span className="text-muted-foreground">Totale per 4</span>
          <span className="font-semibold tabular-nums">40,00 €</span>
        </div>
      </div>
      <span
        className={cn(
          "relative flex h-8 items-center justify-center overflow-hidden rounded-full bg-primary text-[13px] font-medium text-primary-foreground",
          "transition-transform duration-150 ease-(--ease-out)",
          pressed && "scale-[0.97]",
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={sent ? "sent" : "pay"}
            {...swap}
            className="inline-flex items-center gap-1.5"
          >
            {sent ? (
              <>
                <LockSimpleIcon
                  aria-hidden
                  weight="bold"
                  className="size-3.5"
                />
                Apertura di SumUp
              </>
            ) : (
              "Paga e prenota"
            )}
          </motion.span>
        </AnimatePresence>
      </span>
    </>
  );
}

/** La pagina di pagamento di SumUp, vista in piccolo. */
function SumUpCard({ paid }: { paid: boolean }) {
  return (
    <>
      <div className="px-1 pt-1">
        <p className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
          <SumUpLogo className="h-4 w-auto text-foreground" />
          <span className="inline-flex items-center gap-1">
            <LockSimpleIcon aria-hidden weight="bold" className="size-3.5" />
            Pagamento sicuro
          </span>
        </p>
        <p className="mt-2 font-display text-[2rem] leading-none tabular-nums">
          40,00 €
        </p>
        <p className="mt-2 font-mono text-[13px] text-muted-foreground tabular-nums">
          •••• •••• •••• 4821
        </p>
      </div>
      <div className="flex h-8 items-center px-1">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={paid ? "paid" : "wait"} {...swap}>
            {paid ? (
              <StatusBadge tone="success" icon={CheckIcon}>
                Pagamento riuscito
              </StatusBadge>
            ) : (
              <StatusBadge tone="neutral">In attesa</StatusBadge>
            )}
          </motion.span>
        </AnimatePresence>
      </div>
    </>
  );
}

/** L'accredito sul conto del club, e la partita in agenda. */
function ClubCard({ credited }: { credited: boolean }) {
  return (
    <>
      <div className="px-1 pt-1">
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <SumUpLogo
            variant="short"
            label=""
            className="size-3.5 text-foreground"
          />
          Conto SumUp del club
        </p>
        <p className="mt-2 h-8 font-display text-[2rem] leading-none tabular-nums">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={credited ? "in" : "out"}
              {...swap}
              className={cn(
                "inline-block",
                credited ? "text-brand" : "text-zinc-300",
              )}
            >
              {credited ? "+40,00 €" : "0,00 €"}
            </motion.span>
          </AnimatePresence>
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2">
        <span className="w-10 shrink-0 text-right">
          <span className="block text-[13px] font-semibold tabular-nums">
            19:30
          </span>
          <span className="block text-[11px] text-muted-foreground tabular-nums">
            21:00
          </span>
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          Giulia Ferraro e altri 3
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          {credited && (
            <motion.span key="badge" {...swap}>
              <StatusBadge tone="success">Pagata online</StatusBadge>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
