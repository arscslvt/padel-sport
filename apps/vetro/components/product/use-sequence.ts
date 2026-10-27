"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Il passo a cui è arrivata una scena, dato l'elenco dei tempi (in ms) a cui
 * scatta ogni passo. Parte al montaggio, e con il movimento ridotto salta
 * subito all'ultimo: chi non vuole animazioni vede la scena finita.
 */
export function useSequence(times: readonly number[], run = true) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!run) return;
    if (reduce) {
      setStep(times.length);
      return;
    }
    setStep(0);
    const timers = times.map((at, i) =>
      window.setTimeout(() => setStep(i + 1), at),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [run, reduce, times]);

  return step;
}
