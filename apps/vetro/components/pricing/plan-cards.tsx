import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import {
  CheckIcon,
  CloudRainIcon,
  CreditCardIcon,
  IdentificationBadgeIcon,
  LightningIcon,
  SparkleIcon,
  TicketIcon,
  UserCircleIcon,
  UsersFourIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { SumUpLogo } from "@/components/brand/sumup-logo";
import { Reveal } from "@/components/motion/reveal";
import { headingVariants } from "@/components/site/heading";
import { buttonVariants } from "@/components/ui/button";
import {
  COMPLETE_HIGHLIGHTS,
  clientLimitLabel,
  ESSENTIAL_HIGHLIGHTS,
  PLANS,
  type Plan,
  PROMO,
  planName,
  requestHref,
  staffLimitLabel,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

/** Le icone delle righe del piano Completo (COMPLETE_HIGHLIGHTS). */
const COMPLETE_ICONS: Record<
  (typeof COMPLETE_HIGHLIGHTS)[number]["icon"],
  Icon
> = {
  payments: CreditCardIcon,
  events: TicketIcon,
  automations: LightningIcon,
  community: UsersFourIcon,
  players: UserCircleIcon,
  weather: CloudRainIcon,
  ai: SparkleIcon,
};

/**
 * I due piani, affiancati da desktop e uno sopra l'altro da telefono.
 *
 * Il secondo è nella banda verde del club: è quello che consigliamo, e il
 * colore lo dice prima del badge. La sua lista non ripete quella del primo,
 * parte da «tutto di Essenziale» e aggiunge solo quello che cambia, così la
 * differenza fra i due si legge in quattro righe.
 */
export function PlanCards() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)]">
      <Reveal className="flex">
        <EssentialCard compareHref="#confronto" />
      </Reveal>
      <Reveal delay={0.08} className="flex">
        <CompleteCard />
      </Reveal>
    </div>
  );
}

/** La scheda del primo piano. `compareHref` porta alla tabella di confronto. */
export function EssentialCard({ compareHref }: { compareHref: string }) {
  return (
    <PlanCard plan={PLANS[0]}>
      <p className="text-sm font-medium">Include</p>
      <ul className="mt-4 flex flex-col gap-3">
        {ESSENTIAL_HIGHLIGHTS.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-[15px]">
            <CheckIcon
              aria-hidden
              weight="bold"
              className="mt-0.5 size-4 shrink-0 text-brand"
            />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={compareHref}
        className="mt-auto self-start rounded-sm pt-6 text-[14px] text-muted-foreground underline decoration-border underline-offset-4 outline-none transition-colors duration-160 hover:text-foreground hover:decoration-foreground focus-visible:ring-3 focus-visible:ring-ring"
      >
        Vedi tutte le funzioni
      </Link>
    </PlanCard>
  );
}

/** La scheda del piano consigliato: solo quello che aggiunge al primo. */
export function CompleteCard() {
  return (
    <PlanCard plan={PLANS[1]}>
      <p className="text-sm font-medium">
        Tutto di {planName("essential")}, e in più
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {COMPLETE_HIGHLIGHTS.map((feature) => {
          const FeatureIcon = COMPLETE_ICONS[feature.icon];
          return (
            <li
              key={feature.label}
              className="flex items-center gap-3 rounded-[24px] border border-border bg-card p-3 pr-4 text-[15px]"
            >
              <span className="grid size-8 shrink-0 place-content-center rounded-[12px] bg-brand-soft text-brand">
                {/* Accanto a SumUp, il suo simbolo ufficiale al posto di
                    un'icona generica, nel colore del testo. */}
                {feature.icon === "payments" ? (
                  <SumUpLogo
                    variant="short"
                    label=""
                    className="size-4 text-foreground"
                  />
                ) : (
                  <FeatureIcon
                    aria-hidden
                    weight="duotone"
                    className="size-4.5"
                  />
                )}
              </span>
              <span className="flex-1">{feature.label}</span>
              {"soon" in feature && <SoonBadge />}
            </li>
          );
        })}
      </ul>
    </PlanCard>
  );
}

function PlanCard({
  plan,
  children,
}: {
  plan: Plan;
  children: React.ReactNode;
}) {
  const featured = plan.highlighted;

  return (
    <article
      className={cn(
        // Raggio 48: l'ultima riga del piano Completo (raggio 24) occupa gli
        // angoli in basso a 24px dai lati e dal fondo. Il piano Essenziale
        // prende lo stesso raggio, perché le due schede stanno affiancate.
        "concentric relative isolate flex w-full flex-col overflow-hidden border [--inner:1.5rem] [--pad:1.5rem]",
        featured
          ? "tone-club border-transparent"
          : "spotlight border-border bg-card",
      )}
    >
      {featured && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_100%_0%,oklch(0.42_0.08_165/75%),transparent_70%)]"
        />
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className={headingVariants({ size: "card" })}>{plan.name}</h3>
        {featured && (
          <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-primary px-3 text-[12px] font-medium text-primary-foreground">
            Il più completo
          </span>
        )}
      </div>
      <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-muted-foreground">
        {plan.tagline}
      </p>

      <Price plan={plan} />

      {/* I limiti sotto il prezzo: sono parte di quello che si paga, e chi
          confronta i due piani li cerca lì. */}
      <ul className="mt-5 flex flex-col gap-2 text-[15px] font-medium">
        <li className="flex items-center gap-2">
          <UsersThreeIcon
            aria-hidden
            weight="duotone"
            className="size-5 text-brand"
          />
          {clientLimitLabel(plan)}
        </li>
        <li className="flex items-center gap-2">
          <IdentificationBadgeIcon
            aria-hidden
            weight="duotone"
            className="size-5 text-brand"
          />
          {staffLimitLabel(plan)}
        </li>
      </ul>

      <Link
        href={requestHref(plan.id)}
        className={cn(
          buttonVariants({
            size: "lg",
            variant: featured ? "default" : "glass",
          }),
          "mt-6 w-full",
        )}
      >
        Scegli {plan.name}
      </Link>

      {/* Il corpo riempie la scheda: le due schede affiancate hanno la stessa
          altezza, e quello che chiude l'elenco (il link al confronto) si posa
          sul fondo invece di lasciare un vuoto sotto. */}
      <div className="mt-8 flex flex-1 flex-col border-t border-border pt-7">
        {children}
      </div>
    </article>
  );
}

/**
 * Il prezzo pieno, grande, e sotto quello del lancio. Il prezzo pieno resta
 * il protagonista: quello con il codice è un invito, non il listino, e la
 * riga dice per quanto vale così nessuno ha sorprese al quarto mese.
 */
function Price({ plan }: { plan: Plan }) {
  return (
    <div className="mt-8">
      <p className="flex items-baseline gap-2">
        <span className="font-display text-[4rem] leading-none tracking-[-0.03em] tabular-nums">
          {plan.price} €
        </span>
        <span className="text-[15px] text-muted-foreground">al mese + IVA</span>
      </p>
      {/* La pillola resta su una riga anche sui telefoni più stretti: la
          durata va nella riga sotto, che dice anche il prezzo dopo. */}
      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-soft py-1 pr-3 pl-1 text-[13px] whitespace-nowrap text-foreground">
        <span className="inline-flex h-6 items-center rounded-full bg-primary px-2 text-[12px] font-semibold text-primary-foreground tabular-nums">
          {plan.promoPrice} €
        </span>
        Con un codice di invito
      </p>
      <p className="mt-2 text-[13px] text-muted-foreground">
        Per i primi {PROMO.months} mesi, poi {plan.price} € al mese.
      </p>
    </div>
  );
}

export function SoonBadge() {
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-border px-2 text-[11px] font-medium text-muted-foreground">
      In arrivo
    </span>
  );
}
