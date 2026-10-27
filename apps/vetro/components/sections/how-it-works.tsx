"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Words } from "@/components/motion/reveal";
import { MOMENTS, type Moment } from "@/components/product/moments";
import { MomentStories } from "@/components/sections/moment-stories";
import { headingVariants } from "@/components/site/heading";
import { ANCHORS } from "@/lib/brand";
import { BLUR, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Come funziona, raccontato come una giornata.
 *
 * Da desktop il testo scorre a sinistra e a destra resta fermo il palco con
 * il prodotto: quando un momento arriva a metà schermo, la sua scena prende
 * il posto della precedente con un velo di blur e si mette in moto. Gli
 * orari a sinistra non sono numeri di passo, sono l'ora in cui succede.
 * Da telefono e tablet la stessa giornata diventa una serie di storie, in
 * una schermata sola (moment-stories.tsx).
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 0.5", "end 0.5"],
  });
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  const reduce = useReducedMotion();
  const { Scene } = MOMENTS[active];

  return (
    <section id={ANCHORS.how} className="relative py-24 sm:py-32">
      <div className="page-container">
        <h2
          className={cn(headingVariants({ size: "section" }), "max-w-[16ch]")}
        >
          <Words
            lead="Una giornata al club,"
            accent="con Vetro."
            accentClassName="text-brand"
          />
        </h2>

        <MomentStories className="mt-8 lg:hidden" />

        <div className="mt-4 hidden grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-20 lg:grid">
          <ol ref={listRef} className="relative">
            {/* La linea della giornata: si riempie mentre si scorre. */}
            <span
              aria-hidden
              className="absolute top-[14vh] bottom-[14vh] left-[0.3rem] hidden w-px bg-border lg:block"
            >
              <motion.span
                style={{ scaleY: reduce ? 1 : fill }}
                className="absolute inset-0 origin-top bg-brand"
              />
            </span>
            {MOMENTS.map((step, index) => (
              <Step
                key={step.time + step.title}
                index={index}
                active={index === active}
                onActive={setActive}
                {...step}
              />
            ))}
          </ol>

          <div className="hidden lg:block">
            <div className="sticky top-0 flex h-dvh items-center py-24">
              <div className="relative h-[36rem] w-full">
                <div
                  aria-hidden
                  className="absolute inset-[10%] -z-10 rounded-full bg-[radial-gradient(closest-side,oklch(0.9_0.08_165/55%),transparent)] blur-2xl"
                />
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={active}
                    initial={{
                      opacity: 0,
                      filter: BLUR.reveal,
                      transform: "scale(0.97)",
                    }}
                    animate={{
                      opacity: 1,
                      filter: BLUR.none,
                      transform: "scale(1)",
                    }}
                    // Esce più in fretta di quanto entri: lo sguardo è già
                    // sulla scena nuova.
                    exit={{
                      opacity: 0,
                      filter: BLUR.soft,
                      transform: "scale(1.02)",
                      transition: { duration: 0.22, ease: EASE_OUT },
                    }}
                    transition={{ duration: 0.55, ease: EASE_OUT }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Scene />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({
  index,
  time,
  title,
  body,
  active,
  onActive,
}: Moment & {
  index: number;
  active: boolean;
  onActive: (index: number) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  // Attivo quando attraversa la linea a metà schermo.
  const centered = useInView(ref, { margin: "-50% 0px -50% 0px" });

  useEffect(() => {
    if (centered) onActive(index);
  }, [centered, index, onActive]);

  return (
    <li
      ref={ref}
      className="relative flex min-h-[78vh] flex-col justify-center pl-12"
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-0 size-[0.65rem] -translate-y-1/2 rounded-full border-2 transition-colors duration-300",
          active ? "border-brand bg-brand" : "border-zinc-300 bg-background",
        )}
      />
      <div
        className={cn(
          "transition-[opacity,filter] duration-500 ease-(--ease-out)",
          !active && "opacity-35 blur-[1px]",
        )}
      >
        <p className="font-mono text-sm text-brand tabular-nums">{time}</p>
        <h3
          className={cn(
            headingVariants({ size: "card" }),
            "mt-3 lg:text-[2.6rem]",
          )}
        >
          {title}
        </h3>
        <p className="mt-4 max-w-[42ch] text-[17px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </li>
  );
}
