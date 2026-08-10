"use client";

import { Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import {
  EmptyEventsPage,
  EmptySearchResults,
} from "@/components/events/empty-events";
import { EventCard } from "@/components/events/event-card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SortOption } from "@/lib/events";
import { isSortOption, searchEvents, sortEvents } from "@/lib/events";
import type { EventCardData } from "@/sanity/types";

const EASE = [0.22, 1, 0.36, 1] as const;

export function EventsIndex({ events }: { events: EventCardData[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const shouldReduceMotion = useReducedMotion();

  const visibleEvents = useMemo(
    () => sortEvents(searchEvents(events, query), sort),
    [events, query, sort],
  );

  if (events.length === 0) {
    return (
      <div className="grid flex-1 place-content-center">
        <EmptyEventsPage />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/40" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un evento…"
            aria-label="Cerca tra gli eventi"
            className="h-10 border-border bg-muted pr-9 pl-9 text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Azzera la ricerca"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <Tabs
          value={sort}
          onValueChange={(value) => isSortOption(value) && setSort(value)}
        >
          <TabsList className="h-10">
            <TabsTrigger value="recent">Più recenti</TabsTrigger>
            <TabsTrigger value="relevant">Più rilevanti</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <p aria-live="polite" className="sr-only">
        {visibleEvents.length} eventi trovati
      </p>

      {visibleEvents.length === 0 ? (
        <div className="grid flex-1 place-content-center">
          <EmptySearchResults query={query} onReset={() => setQuery("")} />
        </div>
      ) : (
        <motion.div
          layout={!shouldReduceMotion}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleEvents.map((event, index) => (
              <motion.div
                key={event._id}
                layout={!shouldReduceMotion}
                initial={
                  shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.97 }
                }
                transition={{
                  duration: shouldReduceMotion ? 0.15 : 0.4,
                  delay: shouldReduceMotion ? 0 : Math.min(index, 6) * 0.045,
                  ease: EASE,
                }}
              >
                <EventCard event={event} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
