import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Reveal, Words } from "@/components/motion/reveal";
import { PlanPicker } from "@/components/pricing/plan-picker";
import { Promises } from "@/components/pricing/promises";
import { TrialBand } from "@/components/pricing/trial-band";
import { headingVariants } from "@/components/site/heading";
import { ANCHORS, ROUTES } from "@/lib/brand";

/**
 * I prezzi sulla landing: la prova, i due piani e il link al confronto
 * completo. Sta prima del modulo, così chi arriva in fondo sa già quanto
 * dura la prova e cosa cambia fra i piani quando lascia i contatti.
 */
export function PricingSection() {
  return (
    <section id={ANCHORS.pricing} className="py-24 sm:py-32">
      <div className="page-container">
        <h2 className={headingVariants({ size: "section" })}>
          <Words
            lead="Prima lo provi."
            accent="Poi scegli."
            accentClassName="text-brand"
            breakBeforeAccent
          />
        </h2>

        {/* Da telefono la prova e i piani sono due passi distinti, e lo
            spazio fra loro lo dice; da desktop le schede si toccano quasi,
            come una famiglia sola. */}
        <div className="mt-10 flex flex-col gap-10 max-lg:frame-bleed lg:mt-14 lg:gap-3">
          <TrialBand />
          <PlanPicker compareHref={`${ROUTES.pricing}#confronto`} />
        </div>

        <Promises className="mt-12 lg:mt-14" />

        <Reveal className="mt-12 flex justify-center">
          <Link
            href={`${ROUTES.pricing}#confronto`}
            className="group inline-flex items-center gap-1.5 rounded-sm text-[15px] font-medium text-foreground/80 outline-none transition-colors duration-160 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
          >
            Confronta i piani funzione per funzione
            <ArrowRightIcon
              aria-hidden
              className="size-4 transition-transform duration-200 ease-(--ease-out) group-hover:translate-x-0.5"
            />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
