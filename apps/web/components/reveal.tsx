"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { DURATION, EASE, VIEWPORT } from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  /** Ritardo in secondi, per scaglionare gli elementi di una stessa sezione. */
  delay?: number;
  className?: string;
}

/**
 * Reveal legato allo scroll: gemello di `ArticleReveal`, che invece anima al
 * mount. Da usare per tutto ciò che sta sotto la piega.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{
        duration: shouldReduceMotion ? 0.2 : DURATION.base,
        delay: shouldReduceMotion ? 0 : delay,
        ease: EASE,
      }}
    >
      {children}
    </motion.div>
  );
}
