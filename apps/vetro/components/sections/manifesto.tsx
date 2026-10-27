"use client";

import {
  ChatCircleDotsIcon,
  NotebookIcon,
  PhoneCallIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  type MotionValue,
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { type ReactNode, useRef } from "react";

import { headingVariants } from "@/components/site/heading";
import { cn } from "@/lib/utils";

/**
 * Il problema, detto in una frase lunga che si accende mentre la si legge.
 *
 * Ogni parola passa da spenta e sfocata a piena man mano che la sezione
 * scorre: la lettura va alla velocità di chi scorre, e la frase finale, la
 * risposta, arriva per ultima. Le piccole icone dentro il testo sono gli
 * oggetti di cui si parla, il telefono, la chat, il foglio: si riconoscono
 * prima ancora di leggere la parola.
 */

type Token = { text: string; icon?: ReactNode; accent?: boolean };

const iconClass =
  "inline-grid size-[0.82em] -translate-y-[0.04em] place-content-center rounded-[0.26em] bg-brand-soft align-middle text-brand";

const TOKENS: Token[] = [
  ..."Oggi un club di padel si gestisce dal telefono."
    .split(" ")
    .map((text) => ({ text })),
  ..."Le prenotazioni arrivano in chat".split(" ").map((text) => ({ text })),
  {
    text: "",
    icon: <ChatCircleDotsIcon className="size-[0.5em]" weight="fill" />,
  },
  ..."e a tutte le ore, i pagamenti si segnano su un foglio"
    .split(" ")
    .map((text) => ({ text })),
  { text: "", icon: <NotebookIcon className="size-[0.5em]" weight="fill" /> },
  ..."e i giocatori si richiamano uno per uno"
    .split(" ")
    .map((text) => ({ text })),
  // Il punto sta nella stessa parola dell'icona: separato, il browser gli
  // lasciava uno spazio davanti.
  { text: ".", icon: <PhoneCallIcon className="size-[0.5em]" weight="fill" /> },
  ..."Vetro mette tutto in un posto solo,"
    .split(" ")
    .map((text) => ({ text, accent: true })),
  ..."e ti restituisce il tempo per il club."
    .split(" ")
    .map((text) => ({ text, accent: true })),
];

/** La finestra di ogni parola, in frazione dello scroll della sezione. */
const SPAN = 1.6 / TOKENS.length;

const SENTENCE =
  "Oggi un club di padel si gestisce dal telefono. Le prenotazioni arrivano in chat e a tutte le ore, i pagamenti si segnano su un foglio e i giocatori si richiamano uno per uno. Vetro mette tutto in un posto solo, e ti restituisce il tempo per il club.";

export function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.6"],
  });

  return (
    <section className="relative py-28 sm:py-40">
      <div className="page-container">
        <div ref={ref} className="max-w-5xl">
          <p className="sr-only">{SENTENCE}</p>
          <p
            aria-hidden
            className={cn(
              headingVariants({ size: "section" }),
              "text-[2.1rem] leading-[1.14] sm:text-[clamp(2.5rem,4.6vw,4rem)] sm:leading-[1.1]",
            )}
          >
            {TOKENS.map((token, i) => {
              // Ogni parola si accende in una finestra lunga un po' più della
              // sua quota, così le vicine si sovrappongono e la luce scorre.
              // Le finestre sono distribuite su (1 - SPAN): l'ultima chiude
              // esattamente a fine scroll, invece di restare a metà.
              const start = (i / (TOKENS.length - 1)) * (1 - SPAN);
              const end = start + SPAN;
              // La punteggiatura si attacca alla parola prima: niente spazio.
              const glued = token.text === "." || token.icon !== undefined;
              return (
                <span key={`${i}-${token.text}`}>
                  {!glued && i > 0 ? " " : null}
                  {glued && token.icon ? " " : null}
                  <Word
                    progress={scrollYProgress}
                    range={[start, end]}
                    reduce={reduce ?? false}
                    accent={token.accent}
                  >
                    {token.icon ? (
                      <>
                        <span className={iconClass}>{token.icon}</span>
                        {token.text}
                      </>
                    ) : (
                      token.text
                    )}
                  </Word>
                </span>
              );
            })}
          </p>
        </div>
      </div>
    </section>
  );
}

function Word({
  progress,
  range,
  reduce,
  accent,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  reduce: boolean;
  accent?: boolean;
  children: ReactNode;
}) {
  const opacity = useTransform(progress, range, [reduce ? 1 : 0.14, 1]);
  const blur = useTransform(progress, range, [reduce ? 0 : 6, 0]);
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <motion.span
      style={{ opacity, filter }}
      className={cn(accent && "text-brand italic")}
    >
      {children}
    </motion.span>
  );
}
