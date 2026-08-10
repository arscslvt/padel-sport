import { FindPlayersForm } from "@/components/landing/find-players-form";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/ui/heading";

export function FindPlayersSection() {
  return (
    <section
      id="trova-giocatori"
      className="px-2 pb-16 sm:px-3 sm:pb-24 lg:px-4 lg:pb-32"
    >
      <Reveal>
        <SectionHeading
          lead="Ti manca qualche giocatore?"
          accent="Nessun problema."
          className="mb-10 px-4 sm:mb-14 lg:mb-16 lg:px-5"
        />
      </Reveal>

      {/* Stessa griglia a tre colonne delle feature card: il testo occupa la
          prima, il modulo le altre due. */}
      <div className="grid gap-8 md:grid-cols-3 md:gap-2.5">
        <Reveal className="px-4 lg:px-5">
          <p className="text-muted-foreground max-w-[34ch] text-sm leading-relaxed">
            Inserisci la tua richiesta e lascia che sia la community a
            completare il match.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="md:col-span-2">
          <div className="rounded-card bg-muted p-6 sm:p-8 lg:p-10">
            <FindPlayersForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
