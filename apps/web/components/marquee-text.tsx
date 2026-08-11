"use client";

import { motion, useReducedMotion } from "motion/react";
import * as React from "react";

import { cn } from "@/lib/utils";

/** Velocità di scorrimento in px al secondo: lenta quanto basta per leggere. */
const SPEED = 28;
/** Spazio fra le due copie, in px. */
const GAP = 32;

/** Scorrendo il testo esce e rientra: entrambi i bordi vanno sfumati. */
const FADE_BOTH =
  "[mask-image:linear-gradient(to_right,transparent,black_0.75rem,black_calc(100%-0.75rem),transparent)]";
/** Fermo, il testo parte dal bordo sinistro: lì il taglio non c'è. */
const FADE_END =
  "[mask-image:linear-gradient(to_right,black_calc(100%-0.75rem),transparent)]";

/**
 * Testo su una riga che scorre in loop **solo se non ci sta**.
 *
 * Il ciclo continuo si ottiene con due copie affiancate e una traslazione pari
 * a "larghezza di una copia + gap": quando la prima è appena uscita, la seconda
 * si trova esattamente dove stava la prima e il salto è invisibile.
 *
 * La misura usa `offsetWidth`/`clientWidth` e non `getBoundingClientRect`:
 * l'elemento può trovarsi dentro un antenato in scala (l'ingresso della barra
 * evento) e il rect restituirebbe la dimensione trasformata.
 */
export function MarqueeText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const viewportRef = React.useRef<HTMLSpanElement>(null);
  const contentRef = React.useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();

  /** Larghezza di una copia quando eccede il viewport, altrimenti 0. */
  const [overflow, setOverflow] = React.useState(0);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const measure = () => {
      const width = content.offsetWidth;
      setOverflow(width > viewport.clientWidth + 1 ? width : 0);
    };

    measure();

    // Sul viewport per i cambi di larghezza, sul testo per il caricamento dei
    // font e per i cambi di `text`: se il titolo cambia senza cambiare
    // larghezza il verdetto è comunque lo stesso, quindi non serve rimisurare.
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);

    return () => observer.disconnect();
  }, []);

  const scrolling = overflow > 0 && !shouldReduceMotion;
  const distance = overflow + GAP;

  return (
    <span
      ref={viewportRef}
      className={cn(
        "block overflow-hidden",
        scrolling && FADE_BOTH,
        overflow > 0 && !scrolling && FADE_END,
      )}
    >
      <motion.span
        className="flex w-max whitespace-nowrap"
        style={{ gap: scrolling ? GAP : 0 }}
        animate={scrolling ? { x: [0, -distance] } : { x: 0 }}
        transition={
          scrolling
            ? {
                duration: distance / SPEED,
                ease: "linear",
                repeat: Number.POSITIVE_INFINITY,
              }
            : { duration: 0 }
        }
      >
        <span ref={contentRef} className={cn("shrink-0", className)}>
          {text}
        </span>
        {scrolling && (
          <span aria-hidden className={cn("shrink-0", className)}>
            {text}
          </span>
        )}
      </motion.span>
    </span>
  );
}
