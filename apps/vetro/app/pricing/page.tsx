import type { Metadata } from "next";
import Link from "next/link";

import { Reveal, Words } from "@/components/motion/reveal";
import { Comparison } from "@/components/pricing/comparison";
import { PlanCards } from "@/components/pricing/plan-cards";
import { Promises } from "@/components/pricing/promises";
import { TrialBand } from "@/components/pricing/trial-band";
import { headingVariants } from "@/components/site/heading";
import { buttonVariants } from "@/components/ui/button";
import { ANCHORS, anchor } from "@/lib/brand";
import { TRIAL } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Prezzi",
  description: `Prova Vetro gratis per ${TRIAL.days} giorni, con tutte le funzioni. Poi scegli il piano adatto al tuo club.`,
};

/**
 * I prezzi. Prima la prova, che è la porta d'ingresso; poi i due piani; poi
 * il confronto riga per riga per chi vuole i dettagli; in fondo, per chi è
 * ancora indeciso, la demo.
 */
export default function PricingPage() {
  return (
    <main>
      <section className="relative isolate overflow-x-clip pt-32 sm:pt-40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(55%_45%_at_50%_0%,oklch(0.93_0.06_165/80%),transparent_72%)]"
        />
        <div className="page-container">
          <h1 className={headingVariants({ size: "hero" })}>
            <Words
              lead="Prima lo provi."
              accent="Poi scegli."
              accentClassName="text-brand"
              breakBeforeAccent
            />
          </h1>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-muted-foreground">
              {TRIAL.days} giorni con tutte le funzioni, gratis. Poi scegli il
              piano che serve al tuo club, senza vincoli.
            </p>
          </Reveal>

          <div className="mt-14 flex flex-col gap-6 max-lg:frame-bleed sm:mt-20 lg:gap-3">
            <TrialBand />
            <PlanCards />
          </div>

          <Promises className="mt-12 lg:mt-14" />
        </div>
      </section>

      <Comparison />

      <section className="pb-16 sm:pb-24">
        <div className="page-container">
          <div className="flex flex-col items-start gap-8 border-t border-border pt-16 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2
                className={cn(
                  headingVariants({ size: "section" }),
                  "max-w-[16ch]",
                )}
              >
                <Words
                  lead="Non sai quale scegliere?"
                  accent="Ne parliamo."
                  accentClassName="text-brand"
                />
              </h2>
              <Reveal delay={0.1}>
                <p className="mt-4 max-w-[44ch] text-[17px] leading-relaxed text-muted-foreground">
                  Durante la demo guardiamo come lavora il tuo club e ti
                  consigliamo il piano giusto.
                </p>
              </Reveal>
            </div>
            <Reveal delay={0.15}>
              <Link
                href={anchor(ANCHORS.demo)}
                className={buttonVariants({ size: "lg" })}
              >
                Richiedi una demo
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
