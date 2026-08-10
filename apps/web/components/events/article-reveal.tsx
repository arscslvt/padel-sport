"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { DURATION, EASE } from "@/lib/motion";

const VARIANTS = {
  rise: { opacity: 0, y: 16 },
  zoom: { opacity: 0, scale: 0.985 },
} as const;

interface ArticleRevealProps {
  children: ReactNode;
  /** Ritardo in secondi, per scaglionare header, banner e corpo. */
  delay?: number;
  variant?: keyof typeof VARIANTS;
  className?: string;
}

export function ArticleReveal({
  children,
  delay = 0,
  variant = "rise",
  className,
}: ArticleRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? { opacity: 0 } : VARIANTS[variant]}
      animate={{ opacity: 1, y: 0, scale: 1 }}
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
