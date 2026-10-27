import {
  DesktopTowerIcon,
  PaperPlaneTiltIcon,
  PhoneCallIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Reveal, Words } from "@/components/motion/reveal";
import { DemoForm } from "@/components/sections/demo-form";
import { headingVariants } from "@/components/site/heading";
import { ANCHORS } from "@/lib/brand";
import { TRIAL } from "@/lib/plans";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: PaperPlaneTiltIcon,
    title: "Ci lasci i contatti",
    body: "Basta un minuto, e qualche riga sul club.",
  },
  {
    icon: PhoneCallIcon,
    title: "Ti ricontattiamo",
    body: "Attiviamo la prova o fissiamo la demo, come preferisci.",
  },
  {
    icon: DesktopTowerIcon,
    title: "Lo usi sul tuo club",
    body: "Con i tuoi campi, i tuoi orari e i tuoi giocatori.",
  },
] as const;

/**
 * La richiesta di demo, nella banda verde del club.
 *
 * È l'unico punto della pagina in cui il verde torna pieno: come la banda
 * dell'assistenza sul sito del club, chiude il percorso con l'unica azione
 * che conta. `tone-club` ridichiara i token, così campi, testi e tasti si
 * adeguano da soli al fondo scuro.
 */
export function Demo() {
  return (
    <section
      id={ANCHORS.demo}
      className="px-(--gutter-frame) py-(--gutter-frame) sm:py-8"
    >
      {/*
       * Da telefono il modulo poggia direttamente sul verde, senza una scheda
       * sua: dentro la banda non c'è niente negli angoli, e il raggio resta
       * libero. Da sm il modulo torna una scheda, lontana dagli angoli.
       */}
      <div className="tone-club relative isolate overflow-hidden rounded-[2rem] pt-14 pb-12 sm:py-20 lg:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_0%_0%,oklch(0.42_0.08_165/70%),transparent_70%),radial-gradient(50%_50%_at_100%_100%,oklch(0.22_0.045_165),transparent_70%)]"
        />
        <div className="page-container grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          <div>
            <h2
              className={cn(
                headingVariants({ size: "section" }),
                "text-foreground",
              )}
            >
              <Words
                lead="Cominciamo"
                accent="dal tuo club."
                accentClassName="text-brand"
              />
            </h2>
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-[40ch] text-[17px] leading-relaxed text-muted-foreground">
                Lasciaci i contatti. Ti attiviamo i {TRIAL.days} giorni di
                prova, oppure ti mostriamo Vetro in una demo. Senza impegno.
              </p>
            </Reveal>

            <ol className="mt-12 flex flex-col">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="relative flex gap-5 pb-8 last:pb-0"
                >
                  {/* Il filo fra un momento e l'altro. */}
                  {index < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-9 bottom-1 left-[1.05rem] w-px bg-border"
                    />
                  )}
                  <Reveal delay={0.1 + index * 0.08} className="flex gap-5">
                    <span className="grid size-[2.1rem] shrink-0 place-content-center rounded-full border border-border bg-card text-brand">
                      <step.icon
                        aria-hidden
                        weight="duotone"
                        className="size-4"
                      />
                    </span>
                    <span className="pt-1">
                      <span className="block text-[16px] font-semibold">
                        {step.title}
                      </span>
                      <span className="mt-1 block text-[15px] leading-relaxed text-muted-foreground">
                        {step.body}
                      </span>
                    </span>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>

          <Reveal delay={0.12}>
            <DemoForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
