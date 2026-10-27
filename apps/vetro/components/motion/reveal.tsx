"use client";

import { motion, useReducedMotion } from "motion/react";
import { Fragment, type ReactNode } from "react";

import { BLUR, DURATION, EASE_OUT, STAGGER, VIEWPORT } from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  /** Ritardo in secondi, per scaglionare gli elementi di una stessa sezione. */
  delay?: number;
  className?: string;
  /** Quanto sale, in px. */
  distance?: number;
  /**
   * Quanta parte dev'essere in vista perché parta. Per ciò che sta in fondo
   * alla pagina, tagliato dal bordo, la soglia di sempre non si raggiunge mai.
   */
  amount?: number;
}

/**
 * Entrata legata allo scroll: sale di poco, si mette a fuoco, appare.
 *
 * `transform` scritto per intero e non `y`: così Motion lo passa al
 * compositore e il movimento resta fluido anche mentre la pagina carica il
 * resto. Con il movimento ridotto resta solo la dissolvenza.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  distance = 24,
  amount,
}: RevealProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={
        reduce
          ? { opacity: 0 }
          : {
              opacity: 0,
              transform: `translateY(${distance}px)`,
              filter: BLUR.reveal,
            }
      }
      whileInView={{
        opacity: 1,
        transform: "translateY(0px)",
        filter: BLUR.none,
      }}
      viewport={
        amount === undefined ? VIEWPORT : { once: true, amount, margin: "0px" }
      }
      transition={{
        duration: reduce ? 0.3 : DURATION.reveal,
        delay: reduce ? 0 : delay,
        ease: EASE_OUT,
      }}
    >
      {children}
    </motion.div>
  );
}

interface WordsProps {
  /** Il testo in tondo. */
  lead?: string;
  /** Il testo in corsivo: l'accento della frase. */
  accent?: string;
  className?: string;
  accentClassName?: string;
  delay?: number;
  /** Manda il corsivo a capo: per i titoli fatti di due frasi. */
  breakBeforeAccent?: boolean;
}

const word = {
  hidden: {
    opacity: 0,
    transform: "translateY(0.4em)",
    filter: BLUR.reveal,
  },
  shown: {
    opacity: 1,
    transform: "translateY(0em)",
    filter: BLUR.none,
    transition: { duration: DURATION.reveal, ease: EASE_OUT },
  },
} as const;

/**
 * Un titolo che entra parola per parola. Il tondo e il corsivo stanno nella
 * stessa riga come sul sito del club: lo stacco fra i due tagli è tutta
 * l'enfasi che serve. Lo screen reader legge la frase intera, una volta.
 */
export function Words({
  lead,
  accent,
  className,
  accentClassName,
  delay = 0,
  breakBeforeAccent = false,
}: WordsProps) {
  const reduce = useReducedMotion();
  const words = [
    ...(lead ? lead.split(" ").map((text) => ({ text, italic: false })) : []),
    ...(accent
      ? accent.split(" ").map((text) => ({ text, italic: true }))
      : []),
  ];
  const label = [lead, accent].filter(Boolean).join(" ");

  return (
    <span className={className}>
      <span className="sr-only">{label}</span>
      <motion.span
        aria-hidden
        initial={reduce ? false : "hidden"}
        whileInView="shown"
        viewport={VIEWPORT}
        variants={{
          hidden: {},
          shown: {
            transition: { staggerChildren: STAGGER, delayChildren: delay },
          },
        }}
      >
        {words.map(({ text, italic }, i) => (
          // Le parole possono ripetersi: l'indice le distingue.
          // biome-ignore lint/suspicious/noArrayIndexKey: testo statico
          <Fragment key={i}>
            <motion.span
              variants={word}
              className={
                italic
                  ? `inline-block pb-[0.1em] italic ${accentClassName ?? ""}`
                  : "inline-block pb-[0.1em]"
              }
            >
              {text}
            </motion.span>
            {breakBeforeAccent && !italic && words[i + 1]?.italic ? (
              <br />
            ) : i < words.length - 1 ? (
              " "
            ) : null}
          </Fragment>
        ))}
      </motion.span>
    </span>
  );
}
