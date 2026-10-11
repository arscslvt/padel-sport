"use client";

import { motion, type Variants } from "motion/react";

import { TOUR_CHIPS, type TourChip } from "./steps";

/**
 * Il testo di uno step, con le azioni messe in evidenza.
 *
 * Ogni `{nome}` diventa un'etichetta chiara sul fondo scuro: chi guarda
 * trova le cose da fare prima di leggere la frase, e le riconosce sullo
 * schermo dalla stessa icona. Le etichette arrivano una dopo l'altra, appena
 * dopo il testo: è il secondo sguardo, quello che dice «ecco i pulsanti».
 */
export function TourText({ text, reduce }: { text: string; reduce: boolean }) {
  let order = 0;

  return text.split(/(\{\w+\})/).map((part, position) => {
    const name = part.match(/^\{(\w+)\}$/)?.[1];
    const chip = name ? (TOUR_CHIPS as Record<string, TourChip>)[name] : null;
    // biome-ignore lint/suspicious/noArrayIndexKey: i pezzi di una frase fissa non cambiano ordine.
    if (!chip) return <span key={position}>{part}</span>;

    const delay = 0.12 + order++ * 0.06;
    return (
      <motion.span
        // biome-ignore lint/suspicious/noArrayIndexKey: come sopra.
        key={position}
        variants={reduce ? undefined : chipVariants}
        custom={delay}
        className="inline-block align-middle"
      >
        <Chip chip={chip} />
      </motion.span>
    );
  });
}

function Chip({ chip }: { chip: TourChip }) {
  switch (chip.kind) {
    case "action":
      return (
        <span className="inline-flex h-[1.625em] items-center gap-[0.4em] rounded-full bg-white/[0.12] pr-[0.7em] pl-[0.2em] leading-none font-medium whitespace-nowrap text-white ring-1 ring-white/10 ring-inset">
          <span className="flex size-[1.25em] items-center justify-center rounded-full bg-white text-neutral-950">
            <chip.icon
              className="size-[0.8em]"
              strokeWidth={2.25}
              aria-hidden
            />
          </span>
          {chip.label}
        </span>
      );
    case "button":
      return (
        <span className="inline-flex h-[1.625em] items-center rounded-full bg-white px-[0.75em] leading-none font-semibold whitespace-nowrap text-neutral-950">
          {chip.label}
        </span>
      );
    case "count":
      return (
        <span className="bg-danger inline-flex h-[1.25em] min-w-[1.25em] items-center justify-center rounded-full px-[0.35em] text-[0.8em] leading-none font-semibold text-white tabular-nums">
          {chip.label}
        </span>
      );
    case "dot":
      return (
        <span
          aria-hidden
          className="bg-warning inline-block size-[0.5em] rounded-full ring-[0.2em] ring-white/10"
        />
      );
  }
}

/**
 * Si gonfiano appena, con un filo di rimbalzo: è la prima volta che le si
 * vede, e il rimbalzo dice «toccabile». Escono insieme al testo.
 */
const chipVariants: Variants = {
  enter: { opacity: 0, transform: "scale(0.85)" },
  center: (delay: number) => ({
    opacity: 1,
    transform: "scale(1)",
    transition: {
      type: "spring",
      visualDuration: 0.35,
      bounce: 0.3,
      delay,
    },
  }),
};
