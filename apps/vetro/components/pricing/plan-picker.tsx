"use client";

import { useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import { CompleteCard, EssentialCard } from "@/components/pricing/plan-cards";
import { PLANS, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * I due piani sulla landing.
 *
 * Da desktop stanno affiancati, come sulla pagina dei prezzi. Da telefono
 * se ne vede uno per volta, con un selettore sopra: due schede lunghe una
 * sotto l'altra allungano la pagina proprio dove si sta per decidere. Si
 * parte dal piano consigliato.
 *
 * Il selettore è quello dei vantaggi: una seconda fila di etichette, già
 * colorata, ritagliata sulla scheda attiva. La scheda che compare entra con
 * `@starting-style`, un velo di blur che si scioglie: niente JavaScript per
 * l'animazione, e la scheda nascosta resta nel markup per chi indicizza.
 */
export function PlanPicker({ compareHref }: { compareHref: string }) {
  const [active, setActive] = useState<PlanId>("complete");

  // Si nasconde il contenitore della cella, non la scheda: così la griglia
  // non lascia lo spazio vuoto di una seconda riga. La scheda dentro, quando
  // torna visibile, parte dallo stato di `starting:`.
  const cellClass = (id: PlanId) =>
    cn("flex", active !== id && "max-lg:hidden");
  const cardClass = cn(
    "flex w-full",
    "transition-[opacity,filter,translate] duration-500 ease-(--ease-out)",
    "max-lg:starting:translate-y-2 max-lg:starting:opacity-0 max-lg:starting:blur-sm",
  );

  return (
    <div>
      <div className="mb-6 flex justify-center lg:hidden">
        <div
          role="tablist"
          aria-label="Piani"
          className="relative inline-grid grid-cols-2 rounded-full border border-border bg-card p-1 shadow-[0_1px_2px_oklch(0_0_0/4%)]"
        >
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              role="tab"
              aria-selected={active === plan.id}
              aria-controls={`plan-${plan.id}`}
              onClick={() => setActive(plan.id)}
              className="relative z-10 h-10 rounded-full px-6 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
            >
              {plan.name}
            </button>
          ))}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-1 z-20 grid grid-cols-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-[clip-path] duration-500 ease-(--ease-in-out) motion-reduce:transition-none"
            style={{
              clipPath:
                active === PLANS[0].id
                  ? "inset(0 50% 0 0 round 999px)"
                  : "inset(0 0 0 50% round 999px)",
            }}
          >
            {PLANS.map((plan) => (
              <span
                key={plan.id}
                className="grid h-10 place-content-center px-6"
              >
                {plan.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)]">
        <Reveal className={cellClass("essential")}>
          <div id="plan-essential" role="tabpanel" className={cardClass}>
            <EssentialCard compareHref={compareHref} />
          </div>
        </Reveal>
        <Reveal delay={0.08} className={cellClass("complete")}>
          <div id="plan-complete" role="tabpanel" className={cardClass}>
            <CompleteCard />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
