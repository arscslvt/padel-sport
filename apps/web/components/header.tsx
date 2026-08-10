"use client";

import { Menu } from "lucide-react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import Link from "next/link";
import React from "react";

import { NavOverlay } from "@/components/nav-overlay";
import {
  NAV_BAR_INSET,
  NAV_ICON_BUTTON_CLASS,
  NavPillLogo,
  navPillClass,
} from "@/components/nav-pill";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Pillola flottante, identica su ogni rotta.
 *
 * Sopra la foto dell'hero galleggia come vetro; sulle pagine chiare è
 * bianco su bianco, e sono il bordo hairline e l'ombra lunga a staccarla dallo
 * sfondo — non vanno tolti.
 */
export default function Header() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (value) => {
    setScrolled(value > 24);
  });

  return (
    <>
      {/* Sotto l'overlay: quando il menu è aperto è la sua pillola gemella a
          restare visibile e cliccabile. */}
      <header className={cn("fixed inset-x-0 top-0 z-40", NAV_BAR_INSET)}>
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0.2 : DURATION.base,
            delay: shouldReduceMotion ? 0 : 0.1,
            ease: EASE,
          }}
          className={navPillClass(scrolled)}
        >
          <NavPillLogo />

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Apri il menu"
            aria-expanded={open}
            className={NAV_ICON_BUTTON_CLASS}
          >
            <Menu className="size-5" strokeWidth={1.5} />
          </button>
        </motion.div>
      </header>

      <NavOverlay open={open} onOpenChange={setOpen} scrolled={scrolled} />
    </>
  );
}
