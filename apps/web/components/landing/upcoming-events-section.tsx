import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { EventsStrip } from "@/components/landing/events-strip";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { sortEvents } from "@/lib/events";
import { EVENTS_LINK } from "@/lib/links";
import { client } from "@/sanity/client";
import { EVENTS_QUERY } from "@/sanity/queries";
import type { EventCardData } from "@/sanity/types";

export async function UpcomingEventsSection() {
  let events: EventCardData[] = [];

  try {
    const all = await client.fetch<EventCardData[]>(EVENTS_QUERY);
    events = sortEvents(all, "relevant").slice(0, 8);
  } catch {
    // Se Sanity non risponde la sezione sparisce, ma la home resta in piedi.
    return null;
  }

  if (events.length === 0) return null;

  return (
    // `tone-ink` ridichiara i token: lo stesso EventCard rende scuro qui e
    // chiaro su /events, senza varianti.
    <section className="tone-ink overflow-hidden">
      <div className="grid gap-10 py-16 pl-6 sm:py-20 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] lg:gap-14 lg:py-28 lg:pl-[max(2rem,calc((100vw-90rem)/2))]">
        <div className="flex flex-col pr-6 lg:min-h-104 lg:pr-0">
          <Reveal>
            <Heading size="section">Prossimi Eventi</Heading>
            <p className="text-muted-foreground mt-3 max-w-[32ch]">
              Qui non si gioca soltanto.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="mt-8 lg:mt-auto">
            <Button asChild size="pill">
              <Link href={EVENTS_LINK}>
                Vai agli eventi
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </div>

        <EventsStrip events={events} />
      </div>
    </section>
  );
}
