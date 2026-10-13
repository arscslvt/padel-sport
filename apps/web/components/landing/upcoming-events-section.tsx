import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { EventsStrip } from "@/components/landing/events-strip";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { byRecent, isConcluded, isUpcoming } from "@/lib/events";
import { EVENTS_LINK } from "@/lib/links";
import { client } from "@/sanity/client";
import { EVENTS_QUERY } from "@/sanity/queries";
import type { EventCardData } from "@/sanity/types";

/** Un evento in programma è "prossimo" se inizia entro questa finestra. */
const SOON_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

const MAX_EVENTS = 8;

const COPY = {
  upcoming: {
    title: "Prossimi Eventi",
    subtitle: "Qui non si gioca soltanto.",
    cta: "Vai agli eventi",
  },
  archive: {
    title: "Eventi passati",
    subtitle: "In attesa del prossimo, ecco com'è andata.",
    cta: "Sfoglia l'archivio",
  },
} as const;

/**
 * Se c'è qualcosa in arrivo a breve la sezione annuncia solo quello, dal più
 * vicino; altrimenti diventa un piccolo archivio degli ultimi eventi conclusi.
 * Gli eventi in programma ma lontani non compaiono in nessuno dei due casi:
 * non sono "prossimi" e non sono ancora archivio.
 */
export async function UpcomingEventsSection() {
  let all: EventCardData[];

  try {
    all = await client.fetch<EventCardData[]>(EVENTS_QUERY);
  } catch {
    // Se Sanity non risponde la sezione sparisce, ma la home resta in piedi.
    return null;
  }

  const now = Date.now();

  const upcoming = all
    .filter(
      (event) =>
        isUpcoming(event, now) &&
        new Date(event.dateStart).getTime() - now < SOON_WINDOW_MS,
    )
    .sort((a, b) => byRecent(b, a));

  const mode = upcoming.length > 0 ? "upcoming" : "archive";
  const events = (
    mode === "upcoming"
      ? upcoming
      : all.filter((event) => isConcluded(event, now)).sort(byRecent)
  ).slice(0, MAX_EVENTS);

  if (events.length === 0) return null;

  const copy = COPY[mode];

  return (
    // `tone-ink` ridichiara i token: lo stesso EventCard rende scuro qui e
    // chiaro su /events, senza varianti.
    <section className="tone-ink overflow-hidden">
      <div className="mx-auto grid max-w-(--page-max) gap-10 py-16 pl-(--gutter) sm:py-20 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] lg:gap-14 lg:py-28">
        <div className="flex flex-col pr-(--gutter) lg:min-h-104 lg:pr-0">
          <Reveal>
            <Heading size="section">{copy.title}</Heading>
            <p className="text-muted-foreground mt-3 max-w-[32ch]">
              {copy.subtitle}
            </p>
          </Reveal>

          <Reveal delay={0.08} className="mt-8 lg:mt-auto">
            <Button asChild size="pill">
              <Link href={EVENTS_LINK}>
                {copy.cta}
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
