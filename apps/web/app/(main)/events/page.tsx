"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  Calendar,
  Calendar1Icon,
  ChevronLeft,
} from "lucide-react";
import { getInfo } from "@/lib/info";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { usePaginatedQuery } from "convex/react";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import * as date from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventsPage() {
  const [numItems] = useState(5);
  const [referenceTime] = useState(() => {
    const timestamp = Date.now();
    return {
      from: timestamp,
      to: timestamp,
    };
  });

  const {
    results, // array of events
    status, // "LoadingMore" | "CanLoadMore" | "Exhausted"
    loadMore, // function to fetch next page
  } = usePaginatedQuery(
    api.events.list.default,
    { referenceTime },
    { initialNumItems: numItems },
  );

  const now = referenceTime.to;
  const visibleEvents = results.filter((event) => {
    const highlightedAt = (event as { highlightedAt?: number }).highlightedAt;
    if (typeof highlightedAt === "number" && now >= highlightedAt) {
      return true;
    }

    const dateEnd = (event as { dateEnd?: number }).dateEnd;
    if (typeof dateEnd === "number") {
      return event.date <= now && now <= dateEnd;
    }
    return event.date > now;
  });

  return (
    <div className="min-h-[calc(100dvh-8rem)] flex flex-col flex-1 px-6 lg:px-32">
      <div className="flex flex-col">
        <h1 className="font-heading text-white text-3xl font-bold">
          Prossimi eventi
        </h1>
        <p className="text-white/70 text-sm pt-1">
          Gli eventi evidenziati possono comparire anche fuori dal periodo
          attuale.
        </p>
      </div>
      <div className="flex flex-col flex-1 space-y-4 pt-6">
        {status === "LoadingFirstPage" && (
          <div className="flex flex-wrap gap-6">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        )}
        {visibleEvents.length > 0 && (
          <div className="h-max flex flex-row flex-wrap gap-4 md:gap-6">
            {visibleEvents.map((event) => {
              const dateEnd = (event as { dateEnd?: number }).dateEnd;
              const highlightedAt = (event as { highlightedAt?: number })
                .highlightedAt;
              const isInDateRange =
                typeof dateEnd === "number"
                  ? event.date <= now && now <= dateEnd
                  : event.date > now;
              const isHighlighted =
                typeof highlightedAt === "number" &&
                now >= highlightedAt &&
                !isInDateRange;

              const isTomorrow = date.isTomorrow(event.date);
              const isToday = date.isToday(event.date);
              const dateFomat = isToday
                ? "'Oggi alle' HH:mm"
                : isTomorrow
                  ? "'Domani alle' HH:mm"
                  : "dd MMMM yyyy 'alle' HH:mm";

              return (
                <Card
                  key={event._id}
                  className={`bg-card/10 text-white flex-1 min-w-[min(100%,320px)] max-w-full md:max-w-[calc(50%-0.75rem)] lg:max-w-[calc(33.333%-1rem)] ${
                    isHighlighted ? "border-amber-300/40" : "border-white/20"
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="leading-6">{event.title}</CardTitle>
                    <CardDescription className="text-white/60 whitespace-pre-line">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isHighlighted ? (
                      <div className="rounded-md border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                        <p className="font-semibold uppercase tracking-wide text-[11px] text-amber-200/90">
                          Evento evidenziato
                        </p>
                        <div className="pt-1 font-medium">
                          <Calendar className="inline-block mr-2 mb-1 h-4 w-4" />
                          Inizio:{" "}
                          {date.format(event.date, "dd MMMM yyyy 'alle' HH:mm")}
                        </div>
                        {typeof dateEnd === "number" && (
                          <div className="pt-1 font-medium">
                            <Calendar className="inline-block mr-2 mb-1 h-4 w-4" />
                            Fine:{" "}
                            {date.format(dateEnd, "dd MMMM yyyy 'alle' HH:mm")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-white/60 font-medium">
                        <Calendar className="inline-block mr-2 mb-1 h-4 w-4" />
                        {date.format(event.date, dateFomat)}
                      </div>
                    )}
                    {event.url && (
                      <div className="pt-4">
                        <Button asChild variant="outline" className="w-full">
                          <Link href={event.url}>
                            Vai alla pagina evento <ArrowRightIcon />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {status === "Exhausted" && !visibleEvents.length && (
          <div className="flex-1 grid place-content-center">
            <EmptyEventsPage />
          </div>
        )}
        {status === "CanLoadMore" && (
          <div className="flex justify-center py-3">
            <Button
              variant={"ghost"}
              className="text-white"
              onClick={() => loadMore(numItems)}
            >
              Carica altri eventi
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export const EmptyEventsPage = () => (
  <Empty className="text-white">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <Calendar1Icon />
      </EmptyMedia>
      <EmptyTitle>Nessun evento in programma</EmptyTitle>
      <EmptyDescription className="text-white/80">
        Al momento non ci sono eventi o tornei programmati. Torna presto per
        scoprire le ultime novità!
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <div className="flex gap-2">
        <Link href={"/"}>
          <Button variant="outline">
            <ChevronLeft /> Torna alla Home
          </Button>
        </Link>
      </div>
    </EmptyContent>
    <Button variant="link" asChild className="text-muted-foreground" size="sm">
      <a href={getInfo("instagramUrl")} target="_blank" className="text-white">
        Seguici su Instagram <ArrowUpRightIcon />
      </a>
    </Button>
  </Empty>
);
