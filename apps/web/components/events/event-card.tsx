"use client";

import { ArrowUpRight, CalendarDays, Sparkles } from "lucide-react";
import Link from "next/link";

import { EventConcludedBadge } from "@/components/events/event-concluded";
import { SanityImage } from "@/components/events/sanity-image";
import { Heading } from "@/components/ui/heading";
import { formatCardDate, isConcluded } from "@/lib/events";
import { eventLink } from "@/lib/links";
import { cn } from "@/lib/utils";
import type { EventCardData } from "@/sanity/types";

export function EventCard({ event }: { event: EventCardData }) {
  const isHighlighted = !!event.highlighted;
  const concluded = isConcluded(event);

  return (
    <Link
      href={eventLink(event.slug)}
      className={cn(
        "rounded-card bg-card group flex h-full flex-col overflow-hidden border transition-[border-color,box-shadow] hover:shadow-sm",
        "focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
        // Bordi appena accennati: a separare le card bastano il raggio e
        // l'ombra in hover, non una linea marcata.
        isHighlighted
          ? "border-foreground/12 hover:border-foreground/25"
          : "border-border hover:border-foreground/15",
      )}
    >
      {event.banner?.asset ? (
        <div className="relative">
          <SanityImage
            image={event.banner}
            ratio={16 / 10}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            sourceWidth={800}
            imageClassName={cn(
              "transition-transform duration-500 group-hover:scale-[1.03]",
              concluded && "saturate-[0.85]",
            )}
          />
          {concluded && (
            <EventConcludedBadge className="absolute top-3 left-3" />
          )}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {concluded && !event.banner?.asset && <EventConcludedBadge />}
          {isHighlighted && (
            // Pieno invece che ambra: si inverte correttamente anche dentro
            // `tone-ink`, dove la stessa card rende su fondo scuro.
            <span className="bg-foreground text-background inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase">
              <Sparkles className="size-3" />
              In evidenza
            </span>
          )}
          {event.tags?.map((tag) => (
            <span
              key={tag}
              className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[11px] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>

        <Heading size="sub">{event.title}</Heading>

        <p className="text-muted-foreground line-clamp-3 text-sm">
          {event.excerpt}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="text-muted-foreground inline-flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="size-4 shrink-0" />
            {formatCardDate(event)}
          </span>
          <ArrowUpRight className="text-foreground/40 group-hover:text-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  );
}
