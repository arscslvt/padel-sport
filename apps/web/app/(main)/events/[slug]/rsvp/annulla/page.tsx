import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { CalendarDays, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RsvpCancel } from "@/components/events/rsvp-cancel";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { formatEventDate } from "@/lib/events";
import { EVENTS_LINK } from "@/lib/links";
import { client } from "@/sanity/client";
import { EVENT_CALENDAR_QUERY } from "@/sanity/queries";

export const metadata: Metadata = {
  title: "Annulla iscrizione",
  // Pagina raggiungibile solo dal link nella mail: non ha niente da fare in un indice.
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

type CalendarEvent = {
  title: string;
  dateStart: string;
  dateEnd?: string | null;
};

/** Cornice comune ai tre esiti: il contenuto cambia, l'impaginazione no. */
function Frame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <span className="text-muted-foreground inline-flex items-center gap-2 text-[11px] font-medium tracking-wide uppercase">
        <Users className="size-3.5" />
        Iscrizioni
      </span>
      <Heading as="h1" size="page" className="mt-3">
        {title}
      </Heading>
      {children}
    </div>
  );
}

export default async function CancelRsvpPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { token } = await searchParams;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const rsvp =
    token && convexUrl
      ? await new ConvexHttpClient(convexUrl)
          .query(api.modules.eventRsvps.getByToken.default, { token })
          .catch(() => null)
      : null;

  if (!rsvp) {
    return (
      <Frame title="Link non valido">
        <p className="text-muted-foreground mt-4 text-pretty">
          Questo link di annullamento non è più valido. Se ti serve una mano a
          togliere la tua iscrizione, scrivici: ci pensiamo noi.
        </p>
        <Button asChild size="pill" variant="outline" className="mt-8">
          <Link href={`${EVENTS_LINK}/${slug}`}>Torna all'evento</Link>
        </Button>
      </Frame>
    );
  }

  // Il titolo è già sulla riga Convex; da Sanity serve solo la data, che lì non
  // è salvata perché può cambiare dopo l'iscrizione.
  const event = await client
    .fetch<CalendarEvent | null>(EVENT_CALENDAR_QUERY, { slug: rsvp.eventSlug })
    .catch(() => null);

  const dateLabel = event
    ? formatEventDate(event.dateStart, event.dateEnd)
    : null;

  if (rsvp.status === "cancelled") {
    return (
      <Frame title="Iscrizione già annullata">
        <p className="text-muted-foreground mt-4 text-pretty">
          La tua iscrizione a «{rsvp.eventTitle}» risulta già annullata: il
          posto è libero e non ti aspettiamo. Se hai cambiato idea puoi
          iscriverti di nuovo dalla pagina dell'evento.
        </p>
        <Button asChild size="pill" variant="outline" className="mt-8">
          <Link href={`${EVENTS_LINK}/${rsvp.eventSlug}`}>
            Torna all'evento
          </Link>
        </Button>
      </Frame>
    );
  }

  return (
    <Frame title="Vuoi annullare l'iscrizione?">
      <p className="text-muted-foreground mt-4 text-pretty">
        Stai per liberare il posto che avevi prenotato. Non è definitivo: puoi
        iscriverti di nuovo, se resta disponibilità.
      </p>

      <dl className="bg-muted/40 border-border mt-8 grid gap-4 rounded-card border p-6 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-xs uppercase">Evento</dt>
          <dd className="mt-1 font-medium">{rsvp.eventTitle}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase">A nome di</dt>
          <dd className="mt-1 font-medium">{rsvp.name}</dd>
        </div>
        {dateLabel && (
          <div>
            <dt className="text-muted-foreground text-xs uppercase">Quando</dt>
            <dd className="mt-1 inline-flex items-center gap-2 font-medium">
              <CalendarDays className="size-4 shrink-0" />
              {dateLabel}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground text-xs uppercase">Persone</dt>
          <dd className="mt-1 font-medium">
            {rsvp.seats === 1 ? "Solo tu" : `${rsvp.seats} persone`}
          </dd>
        </div>
      </dl>

      <RsvpCancel token={token as string} eventSlug={rsvp.eventSlug} />
    </Frame>
  );
}
