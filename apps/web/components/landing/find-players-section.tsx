import { FindPlayersPanel } from "@/components/landing/find-players/panel";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/ui/heading";
import { ANCHORS } from "@/lib/anchors";

export function FindPlayersSection() {
  return (
    <section
      id={ANCHORS.findPlayers}
      className="frame-container pb-16 sm:pb-24 lg:pb-32"
    >
      <Reveal>
        <SectionHeading
          lead="Ti manca qualche giocatore?"
          accent="Nessun problema."
          className="frame-inset mb-10 sm:mb-14 lg:mb-16"
        />
      </Reveal>

      <FindPlayersPanel />
    </section>
  );
}
