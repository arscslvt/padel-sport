import {
  Sword03Icon,
  TennisRacketIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Reveal } from "@/components/reveal";
import { Heading, SectionHeading } from "@/components/ui/heading";

const FEATURES: ReadonlyArray<{
  icon: typeof TennisRacketIcon;
  title: string;
  text: string;
}> = [
  {
    icon: TennisRacketIcon,
    title: "Gioca",
    text: "Campi pronti per il tuo prossimo match, con prenotazione semplice e veloce.",
  },
  {
    // `ai-co-editing` è un'icona Pro: nel set free UserGroup è l'equivalente
    // più vicino al pittogramma del mockup.
    icon: UserGroupIcon,
    title: "Conosci",
    text: "Trova nuovi compagni di gioco e mettiti alla prova con giocatori del tuo livello.",
  },
  {
    icon: Sword03Icon,
    title: "Competi",
    text: "Tornei, eventi e sfide per trasformare ogni partita in qualcosa di più.",
  },
];

export function FeatureCards() {
  return (
    <section className="px-2 py-16 sm:px-3 sm:py-24 lg:px-4 lg:py-32">
      <Reveal>
        <SectionHeading
          lead="Più di un campo."
          accent="Una community."
          className="mb-10 px-4 sm:mb-14 lg:mb-16 lg:px-5"
        />
      </Reveal>

      {/* Si salta il passaggio a due colonne: una terza card orfana sta peggio
          di tre card impilate. */}
      <div className="grid gap-2.5 md:grid-cols-3">
        {FEATURES.map(({ icon, title, text }, index) => (
          <Reveal key={title} delay={index * 0.07} className="flex">
            <article className="rounded-card bg-muted flex min-h-68 w-full flex-col p-6 md:min-h-96 lg:min-h-108 lg:p-9">
              <HugeiconsIcon
                icon={icon}
                size={28}
                color="currentColor"
                strokeWidth={1.5}
                className="text-foreground/60"
              />
              {/* `mt-auto` spinge il testo in basso: è questo che fa leggere
                  l'altezza generosa come intenzionale e non come spazio vuoto. */}
              <div className="mt-auto pt-12">
                <Heading as="h3" size="card">
                  {title}
                </Heading>
                <p className="text-muted-foreground mt-2 max-w-[30ch] text-sm leading-relaxed">
                  {text}
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
