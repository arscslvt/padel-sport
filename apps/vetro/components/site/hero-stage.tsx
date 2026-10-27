"use client";

import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef } from "react";

import { AgendaPreview } from "@/components/product/agenda-preview";

/**
 * Il palco dell'hero: l'agenda del gestionale, inclinata come un foglio
 * appoggiato sul tavolo, che si raddrizza mentre si scorre e viene incontro.
 *
 * L'inclinazione è legata allo scroll attraverso una molla: senza, seguirebbe
 * la rotella a scatti; con la molla prende un po' di peso e si posa. Con il
 * movimento ridotto l'agenda è dritta da subito.
 */
export function HeroStage() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 0.25"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.4,
  });

  const rotate = useTransform(progress, [0, 1], [reduce ? 0 : 22, 0]);
  const scale = useTransform(progress, [0, 1], [reduce ? 1 : 0.9, 1]);
  const lift = useTransform(progress, [0, 1], [reduce ? 0 : 40, 0]);
  const transform = useMotionTemplate`translateY(${lift}px) rotateX(${rotate}deg) scale(${scale})`;
  const glow = useTransform(progress, [0, 1], [0.35, 1]);

  return (
    // La maschera sfuma in basso l'agenda insieme alla sua ombra: niente
    // taglio netto dove finisce la sezione. Una maschera però nasconde tutto
    // quello che esce dal suo riquadro, ombra compresa: per questo il
    // riquadro va da un bordo all'altro dello schermo e sopra ha margine,
    // mentre l'agenda resta della sua misura nel mezzo. Il resto oltre lo
    // schermo lo taglia l'hero.
    <div className="mx-[calc(50%-50vw)] mt-4 px-(--gutter-frame) pt-10 pb-10 [mask-image:linear-gradient(to_bottom,black_60%,transparent_96%)] sm:mt-10">
      <div ref={ref} className="relative mx-auto max-w-6xl">
        {/* La luce verde dietro l'agenda: cresce mentre l'agenda si raddrizza. */}
        <motion.div
          aria-hidden
          style={{ opacity: glow }}
          className="pointer-events-none absolute inset-x-[8%] top-0 bottom-1/3 -z-10 rounded-[50%] bg-[radial-gradient(closest-side,oklch(0.86_0.1_165/70%),transparent)] blur-3xl"
        />
        <div
          className="rise-in [perspective:1800px]"
          style={{ "--i": 6 } as React.CSSProperties}
        >
          <motion.div
            style={{ transform, transformOrigin: "50% 0%" }}
            className="will-change-transform"
          >
            <AgendaPreview />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
