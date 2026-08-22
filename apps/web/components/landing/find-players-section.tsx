import { FindPlayersPanel } from "@/components/landing/find-players/panel";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/ui/heading";
import { ANCHORS } from "@/lib/anchors";

export function FindPlayersSection() {
  return (
    <section
      id={ANCHORS.findPlayers}
      className="px-2 pb-16 sm:px-3 sm:pb-24 lg:px-4 lg:pb-32"
    >
      <Reveal>
        <SectionHeading
          lead="Ti manca qualche giocatore?"
          accent="Nessun problema."
          className="mb-10 px-4 sm:mb-14 lg:mb-16 lg:px-5"
        />
      </Reveal>

      <FindPlayersPanel />
    </section>
  );
}
