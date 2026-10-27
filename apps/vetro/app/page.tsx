import { Benefits } from "@/components/sections/benefits";
import { CapabilitiesMarquee } from "@/components/sections/capabilities-marquee";
import { Demo } from "@/components/sections/demo";
import { Faq } from "@/components/sections/faq";
import { FeaturesBento } from "@/components/sections/features-bento";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Manifesto } from "@/components/sections/manifesto";
import { Origin } from "@/components/sections/origin";
import { PlayersRail } from "@/components/sections/players-rail";
import { PricingSection } from "@/components/sections/pricing-section";
import { SumUpSection } from "@/components/sections/sumup";
import { Hero } from "@/components/site/hero";
import { MobileCta } from "@/components/site/mobile-cta";

/**
 * Il percorso della pagina: la promessa, il problema, come funziona una
 * giornata, cosa c'è dentro, cosa cambia, cosa vedono i giocatori, da dove
 * viene, quanto costa, e l'iscrizione. Subito dopo i vantaggi, i pagamenti
 * con SumUp: per chi lo usa già è il motivo più concreto per provare. Le domande stanno dopo il modulo, per
 * chi ha ancora un dubbio prima di scrivere.
 *
 * Da telefono e tablet il percorso è più corto e porta dritto alla prova:
 * restano la promessa, la giornata (in storie), i vantaggi, SumUp, il club
 * da cui è nato, i prezzi e il modulo, con la prova sempre a un pollice nella barra in basso. Le tessere
 * delle funzioni e le schede dei giocatori restano al desktop,
 * dove c'è lo spazio per guardarle.
 */
export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <Manifesto />
        <HowItWorks />
        <DesktopOnly>
          <FeaturesBento />
        </DesktopOnly>
        <CapabilitiesMarquee />
        <Benefits />
        <SumUpSection />
        <DesktopOnly>
          <PlayersRail />
        </DesktopOnly>
        {/* Anche da telefono, in breve: subito prima dei prezzi, la prova
            che un club vero lo usa ogni giorno. */}
        <Origin />
        <PricingSection />
        <Demo />
        <Faq />
      </main>
      <MobileCta />
    </>
  );
}

function DesktopOnly({ children }: { children: React.ReactNode }) {
  return <div className="hidden lg:block">{children}</div>;
}
