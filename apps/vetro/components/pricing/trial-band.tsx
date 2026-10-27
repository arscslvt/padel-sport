"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useInView } from "motion/react";
import Link from "next/link";
import { type CSSProperties, useRef } from "react";

import { Reveal } from "@/components/motion/reveal";
import { headingVariants } from "@/components/site/heading";
import { buttonVariants } from "@/components/ui/button";
import { requestHref, TRIAL } from "@/lib/plans";
import { cn } from "@/lib/utils";

const DAYS = Array.from({ length: TRIAL.days }, (_, i) => i + 1);

/**
 * La prova gratuita, in una fascia sopra i piani: è la porta d'ingresso, e
 * viene prima della scelta.
 *
 * I giorni della prova sono altrettante tacche che si accendono una dopo l'altra
 * quando la fascia entra in vista: la durata si vede prima di leggerla.
 * Ogni settima tacca è più alta, così si contano le settimane. La transizione
 * è CSS, scaglionata dall'indice: gira fuori dal thread principale e, con il
 * movimento ridotto, le tacche sono già accese.
 */
export function TrialBand() {
  const ref = useRef<HTMLDivElement>(null);
  const lit = useInView(ref, { once: true, amount: 0.6 });

  return (
    <Reveal>
      <section
        aria-labelledby="trial-title"
        // Raggio 48: da desktop il tasto (raggio 24) occupa l'angolo in basso a
        // sinistra a 24px dai due lati, e 24 + 24 fa 48. Lo stesso raggio
        // delle schede dei piani, che le stanno sotto.
        className="spotlight concentric grid grid-cols-1 gap-8 overflow-hidden border border-border bg-card [--inner:1.5rem] [--pad:1.5rem] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14"
      >
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {TRIAL.name}
          </p>
          <h2
            id="trial-title"
            className={cn(headingVariants({ size: "section" }), "mt-2")}
          >
            <span className="text-brand">{TRIAL.days}</span> giorni
          </h2>
          <p className="mt-3 max-w-[40ch] text-[16px] leading-relaxed text-muted-foreground">
            Con tutte le funzioni del piano Completo, sul tuo club e con i tuoi
            giocatori. Gratis e senza impegno.
          </p>
          <Link
            href={requestHref(TRIAL.id)}
            className={cn(buttonVariants({ size: "lg" }), "mt-7")}
          >
            Inizia la prova gratuita
            <ArrowRightIcon
              aria-hidden
              className="transition-transform duration-200 ease-(--ease-out) group-hover/button:translate-x-0.5"
            />
          </Link>
        </div>

        <div ref={ref} data-lit={lit || undefined} className="group/days">
          <div className="mb-3 flex justify-between text-[13px] text-muted-foreground">
            <span>Oggi</span>
            <span>Giorno {TRIAL.days}</span>
          </div>
          <div
            role="img"
            aria-label={`${TRIAL.days} giorni di prova`}
            className="flex h-14 items-end gap-[3px] sm:gap-1"
          >
            {DAYS.map((day) => (
              <span
                key={day}
                style={{ "--i": day } as CSSProperties}
                className={cn(
                  "flex-1 origin-bottom rounded-full bg-zinc-200",
                  day % 7 === 1 ? "h-full" : "h-[70%]",
                  "scale-y-40 transition-[scale,background-color] duration-500 ease-(--ease-out)",
                  "[transition-delay:calc(var(--i)*14ms)]",
                  "group-data-[lit]/days:scale-y-100 group-data-[lit]/days:bg-brand",
                  "motion-reduce:scale-y-100 motion-reduce:bg-brand motion-reduce:transition-none",
                )}
              />
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-[14px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            Poi scegli il piano che ti serve
            <span className="h-px flex-1 bg-border" />
          </p>
        </div>
      </section>
    </Reveal>
  );
}
