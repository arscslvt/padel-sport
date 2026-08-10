"use client";

import { EventCard } from "@/components/events/event-card";
import { Reveal } from "@/components/reveal";
import type { EventCardData } from "@/sanity/types";

/**
 * Riga di eventi che sborda a destra.
 *
 * Scroll-snap nativo invece di embla: zero JS, momentum nativo su iOS, tastiera
 * e trackpad gratis. `min-w-0` è obbligatorio — un figlio di grid non si
 * restringe sotto il proprio contenuto, e con `main` in `overflow-x-hidden` il
 * risultato sarebbe una riga tagliata invece di uno scroller.
 */
export function EventsStrip({ events }: { events: EventCardData[] }) {
  return (
    <div className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pr-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {events.map((event, index) => (
        <Reveal
          key={event._id}
          delay={Math.min(index, 4) * 0.06}
          className="w-[78vw] max-w-80 shrink-0 snap-start sm:w-76"
        >
          <EventCard event={event} />
        </Reveal>
      ))}
    </div>
  );
}
