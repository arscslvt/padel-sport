import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { getInfo } from "@/lib/info";
import { EVENTS_LINK } from "@/lib/links";

/**
 * Contenuto della 404, condiviso tra la not-found di root e quella del gruppo
 * `(main)`: la prima porta con sé Header e Footer, la seconda no perché il
 * layout del gruppo li rende già.
 */
export function NotFoundHero() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
      <p className="text-muted-foreground border-border rounded-full border px-4 py-1 text-xs tracking-[0.18em] uppercase">
        Errore 404
      </p>

      <div className="space-y-4">
        <Heading as="h1" size="page">
          Qui il match non si gioca.
        </Heading>
        <p className="text-muted-foreground mx-auto max-w-xl text-pretty sm:text-lg">
          La pagina che cerchi non esiste o è stata spostata. Torna in campo
          dalla home o vai direttamente ai nostri eventi.
        </p>
      </div>

      <div className="flex w-full flex-col justify-center gap-2.5 sm:w-auto sm:flex-row">
        <Button asChild size="pill-lg">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Torna alla home
          </Link>
        </Button>
        <Button asChild size="pill-lg" variant="outline">
          <Link href={EVENTS_LINK}>
            <CalendarDays className="size-4" />
            Vedi eventi
          </Link>
        </Button>
      </div>

      <div className="text-muted-foreground mt-3 flex flex-col items-center gap-2 text-sm sm:flex-row">
        <MapPin className="size-4" />
        <span>{getInfo("address")}</span>
        <span className="hidden sm:inline">•</span>
        <a
          href={getInfo("bookingUrl")}
          className="text-foreground decoration-foreground/30 font-medium underline underline-offset-4 transition-colors hover:decoration-current"
        >
          Prenota un campo
        </a>
      </div>
    </div>
  );
}
