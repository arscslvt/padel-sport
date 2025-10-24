"use client";

import Link from "next/link";
import {
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
import { api } from "@/convex/_generated/api";
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

  const {
    results, // array of events
    status, // "LoadingMore" | "CanLoadMore" | "Exhausted"
    loadMore, // function to fetch next page
  } = usePaginatedQuery(
    api.events.list.default,
    {},
    { initialNumItems: numItems }
  );

  return (
    <div className="min-h-[calc(100dvh-8rem)] flex flex-col flex-1 px-6 lg:px-32">
      <div className="flex flex-col ">
        <h1 className="font-heading text-white text-3xl font-bold">
          Prossimi eventi
        </h1>
      </div>
      <div className="flex flex-col flex-1 space-y-4 pt-6">
        {status === "LoadingFirstPage" && (
          <div className="flex flex-wrap gap-6">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        )}
        {results.length > 0 && (
          <div className="h-max flex flex-row flex-wrap gap-4 md:gap-6">
            {results.map((event) => {
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
                  className="bg-card/10 border-white/20 text-white flex-1 min-w-[min(100%,320px)] max-w-full md:max-w-[calc(50%-0.75rem)] lg:max-w-[calc(33.333%-1rem)]"
                >
                  <CardHeader>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription className="text-white/60 whitespace-pre-line">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {event.date && (
                      <div className="text-sm text-white/60 font-medium">
                        <Calendar className="inline-block mr-2 mb-1 h-4 w-4" />
                        {date.format(event.date, dateFomat)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {status !== "LoadingFirstPage" && !results.length && (
          <div className="flex-1 grid place-content-center">
            <EmptyEventsPage />
          </div>
        )}
        {status !== "CanLoadMore" && (
          <div className="flex justify-center py-3">
            <Button variant={"ghost"} className="text-white">
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
