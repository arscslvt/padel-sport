import { CheckIcon, MinusIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Fragment } from "react";

import { Words } from "@/components/motion/reveal";
import { SoonBadge } from "@/components/pricing/plan-cards";
import { headingVariants } from "@/components/site/heading";
import { buttonVariants } from "@/components/ui/button";
import {
  FEATURE_GROUPS,
  type Feature,
  PLANS,
  type PlanId,
  requestHref,
  TRIAL,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

/** La colonna del piano consigliato, tinta dall'alto in basso. */
const featuredColumn = "bg-brand-soft/55";

/**
 * Il confronto, funzione per funzione.
 *
 * Una tabella vera, con l'intestazione dei piani che resta ferma sotto la
 * navigazione mentre si scorre: arrivati a metà elenco si sa ancora quale
 * colonna è quale. La colonna del piano Completo è tinta per tutta l'altezza,
 * anche nelle righe dei gruppi, così si segue con l'occhio.
 *
 * Da telefono la colonna della prova sparisce: la prova ha tutto, lo dice
 * la riga sopra la tabella, e restano due colonne strette accanto ai nomi.
 */
export function Comparison() {
  return (
    <section id="confronto" className="py-24 sm:py-32">
      <div className="page-container">
        <h2
          className={cn(headingVariants({ size: "section" }), "max-w-[18ch]")}
        >
          <Words
            lead="Tutte le funzioni,"
            accent="piano per piano."
            accentClassName="text-brand"
          />
        </h2>
        <p className="mt-4 text-[15px] text-muted-foreground md:hidden">
          La {TRIAL.name.toLowerCase()} include tutto.
        </p>

        <table className="mt-10 w-full border-separate border-spacing-0 text-left lg:mt-14">
          <caption className="sr-only">
            Confronto delle funzioni fra i piani
          </caption>
          <thead>
            <tr>
              <th scope="col" className={cn(stickyHead, "w-auto")}>
                <span className="sr-only">Funzione</span>
              </th>
              <th
                scope="col"
                className={cn(stickyHead, "hidden w-44 md:table-cell")}
              >
                <PlanHead
                  name={TRIAL.name}
                  href={requestHref(TRIAL.id)}
                  cta="Inizia la prova"
                />
              </th>
              {PLANS.map((plan) => (
                <th
                  key={plan.id}
                  scope="col"
                  className={cn(
                    stickyHead,
                    "w-[5.25rem] sm:w-32 md:w-44",
                    plan.highlighted && "rounded-t-2xl",
                    // Pieno e non velato: la riga che ci scorre sotto non deve
                    // trasparire. È lo stesso colore della colonna tinta.
                    plan.highlighted &&
                      "bg-[color-mix(in_oklab,var(--brand-soft)_55%,var(--background))]",
                  )}
                >
                  <PlanHead
                    name={plan.name}
                    href={requestHref(plan.id)}
                    cta={`Scegli ${plan.name}`}
                    featured={plan.highlighted}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {FEATURE_GROUPS.map((group, groupIndex) => (
              <Fragment key={group.title}>
                <tr>
                  <th
                    scope="colgroup"
                    className={cn(
                      "pb-3 align-bottom text-[15px] font-semibold",
                      groupIndex === 0 ? "pt-8" : "pt-12",
                    )}
                  >
                    {group.title}
                  </th>
                  <td className="hidden md:table-cell" />
                  {PLANS.map((plan) => (
                    <td
                      key={plan.id}
                      className={cn(plan.highlighted && featuredColumn)}
                    />
                  ))}
                </tr>
                {group.features.map((feature, index) => {
                  const last =
                    groupIndex === FEATURE_GROUPS.length - 1 &&
                    index === group.features.length - 1;
                  return (
                    <tr key={feature.label}>
                      <th
                        scope="row"
                        className="border-t border-border py-3.5 pr-4 text-[14px] font-normal sm:text-[15px]"
                      >
                        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          {feature.label}
                          {feature.soon && <SoonBadge />}
                        </span>
                      </th>
                      <td className="hidden border-t border-border text-center md:table-cell">
                        <Mark included value={feature.values?.trial} />
                      </td>
                      {PLANS.map((plan) => (
                        <td
                          key={plan.id}
                          className={cn(
                            "border-t border-border text-center",
                            plan.highlighted && featuredColumn,
                            plan.highlighted && last && "rounded-b-2xl",
                          )}
                        >
                          <Mark
                            included={includes(feature, plan.id)}
                            value={feature.values?.[plan.id]}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/*
 * L'intestazione resta sotto la pillola di navigazione: 76px da telefono,
 * 88px da sm in su, cioè il suo margine più la sua altezza e un respiro.
 */
const stickyHead =
  "sticky top-[4.75rem] z-10 bg-background/90 px-2 py-4 align-bottom backdrop-blur-md sm:top-[5.5rem]";

const includes = (feature: Feature, plan: PlanId) =>
  feature.plans.includes(plan);

function PlanHead({
  name,
  href,
  cta,
  featured,
}: {
  name: string;
  href: string;
  cta: string;
  featured?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span
        className={cn(
          "text-[13px] font-semibold sm:text-[15px]",
          featured && "text-brand",
        )}
      >
        {name}
      </span>
      <Link
        href={href}
        className={cn(
          buttonVariants({
            size: "sm",
            variant: featured ? "default" : "glass",
          }),
          "hidden w-full md:inline-flex",
        )}
      >
        {cta}
      </Link>
    </div>
  );
}

/**
 * Il contenuto di una cella: la spunta, il trattino, o un valore scritto per
 * le righe che non sono un sì o un no, come il numero di clienti.
 */
function Mark({ included, value }: { included: boolean; value?: string }) {
  if (value) {
    return (
      <span className="text-[13px] font-medium tabular-nums sm:text-[14px]">
        {value}
      </span>
    );
  }
  return included ? (
    <>
      <CheckIcon
        aria-hidden
        weight="bold"
        className="mx-auto size-4.5 text-brand"
      />
      <span className="sr-only">Incluso</span>
    </>
  ) : (
    <>
      <MinusIcon
        aria-hidden
        weight="bold"
        className="mx-auto size-4 text-zinc-300"
      />
      <span className="sr-only">Non incluso</span>
    </>
  );
}
