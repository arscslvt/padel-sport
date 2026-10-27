import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { CSSProperties } from "react";

import { LogoMark } from "@/components/brand/logo";
import { headingVariants } from "@/components/site/heading";
import { HeroStage } from "@/components/site/hero-stage";
import { buttonVariants } from "@/components/ui/button";
import { ANCHORS, anchor, BRAND } from "@/lib/brand";
import { requestHref, TRIAL } from "@/lib/plans";
import { cn } from "@/lib/utils";

const LEAD = ["Meno", "telefonate."];
const ACCENT = ["Più", "partite."];

/** L'indice di entrata di ogni elemento dell'hero, per `.rise-in`. */
const at = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * L'apertura. Una promessa in quattro parole, a sinistra come sul sito del
 * club, e a destra quello che serve per decidere: cos'è Vetro e il tasto per
 * vederlo. Sotto, il gestionale vero che lavora da solo.
 *
 * Le parole entrano in CSS, una dopo l'altra, appena arriva il foglio di
 * stile: nessuna attesa di JavaScript per il primo colpo d'occhio.
 */
export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-x-clip pt-32 sm:pt-40"
    >
      {/* Una luce verde chiara sopra il titolo, il colore del club. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[56rem] bg-[radial-gradient(55%_45%_at_50%_0%,oklch(0.93_0.06_165/85%),transparent_72%),radial-gradient(35%_30%_at_88%_8%,oklch(0.9_0.08_165/45%),transparent_70%)]"
      />

      <div className="page-container">
        <p
          className="rise-in mb-6 inline-flex items-center gap-2 text-sm font-medium text-foreground/80"
          style={at(0)}
        >
          <LogoMark className="size-5" />
          {BRAND.tagline}
        </p>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <h1 className={cn(headingVariants({ size: "hero" }), "max-w-[14ch]")}>
            <span className="sr-only">Meno telefonate. Più partite.</span>
            <span aria-hidden>
              {LEAD.map((word, i) => (
                <span
                  key={word}
                  className="rise-in inline-block"
                  style={at(i + 1)}
                >
                  {word}
                  {" "}
                </span>
              ))}
              <br />
              {ACCENT.map((word, i) => (
                <span
                  key={word}
                  className="rise-in inline-block pb-[0.08em] text-brand italic"
                  style={at(i + 3)}
                >
                  {word}
                  {i === 0 ? " " : ""}
                </span>
              ))}
            </span>
          </h1>

          <div className="max-w-sm lg:pb-3">
            <p
              className="rise-in text-[17px] leading-relaxed text-muted-foreground"
              style={at(4)}
            >
              {BRAND.description}
            </p>
            <div
              // `hero-cta`: quando esce dallo schermo, da telefono compare la
              // barra con la prova (mobile-cta.tsx).
              id="hero-cta"
              className="rise-in mt-7 flex flex-wrap items-center gap-3"
              style={at(5)}
            >
              {/* I tasti che portano a una sezione sono link: lo stile del
                  Button di shadcn, sull'elemento giusto. */}
              <Link
                href={requestHref(TRIAL.id)}
                className={buttonVariants({ size: "lg" })}
              >
                Inizia la prova gratuita
              </Link>
              <a
                href={anchor(ANCHORS.how)}
                className={buttonVariants({ size: "lg", variant: "glass" })}
              >
                Come funziona
                <ArrowDownIcon
                  aria-hidden
                  className="transition-transform duration-200 ease-(--ease-out) group-hover/button:translate-y-0.5"
                />
              </a>
            </div>
          </div>
        </div>

        <HeroStage />
      </div>
    </section>
  );
}
