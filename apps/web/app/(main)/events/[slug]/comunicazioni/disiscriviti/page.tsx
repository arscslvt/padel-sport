import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CommunicationUnsubscribe } from "@/components/events/communication-unsubscribe";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { EVENTS_LINK } from "@/lib/links";

export const metadata: Metadata = {
  title: "Comunicazioni dell'evento",
  // Raggiungibile solo dal link in fondo a una mail: non ha niente da fare in un indice.
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
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
        <Mail className="size-3.5" />
        Comunicazioni
      </span>
      <Heading as="h1" size="page" className="mt-3">
        {title}
      </Heading>
      {children}
    </div>
  );
}

/**
 * Pagina di conferma della disiscrizione dalle comunicazioni di un evento.
 *
 * Ricalcata su quella dell'annullamento, e volutamente separata: sono due
 * azioni con conseguenze diverse. Qui il posto non si libera, e la pagina lo
 * ripete due volte perché è la cosa che chi arriva teme di più.
 */
export default async function UnsubscribePage({
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
          Questo link non è più valido. Se non vuoi più ricevere le nostre
          comunicazioni su questo evento, scrivici: ci pensiamo noi.
        </p>
        <Button asChild size="pill" variant="outline" className="mt-8">
          <Link href={`${EVENTS_LINK}/${slug}`}>Torna all'evento</Link>
        </Button>
      </Frame>
    );
  }

  if (rsvp.unsubscribedAt) {
    return (
      <Frame title="Sei già fuori dalle comunicazioni">
        <p className="text-muted-foreground mt-4 text-pretty">
          Non ti mandiamo altre mail su «{rsvp.eventTitle}»
          {rsvp.status === "confirmed"
            ? ": la tua iscrizione però resta valida e il posto è ancora tuo."
            : "."}
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
    <Frame title="Vuoi smettere di ricevere queste mail?">
      <p className="text-muted-foreground mt-4 text-pretty">
        Non ti manderemo più comunicazioni su «{rsvp.eventTitle}»: né
        aggiornamenti sull'orario, né avvisi dell'ultimo momento.
      </p>
      <p className="text-muted-foreground mt-4 text-pretty">
        <strong className="text-foreground font-medium">
          La tua iscrizione non cambia.
        </strong>{" "}
        Il posto resta prenotato a tuo nome e ti aspettiamo lo stesso. Se invece
        volevi liberarlo, usa il link «annulla l'iscrizione» che trovi nella
        mail di conferma.
      </p>

      <CommunicationUnsubscribe
        token={token as string}
        eventSlug={rsvp.eventSlug}
      />
    </Frame>
  );
}
