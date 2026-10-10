"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import { dayLabel, dayOfMonth, weekdayInitial } from "./lib";

/**
 * La striscia dei giorni in cima all'agenda.
 *
 * Il giorno scelto è un tondo pieno, come nel calendario di iOS; sotto ogni
 * giorno un punto dice se c'è qualcosa in agenda, ambra se c'è almeno una
 * prenotazione da confermare. Scorre di lato con lo snap, e il giorno scelto
 * si porta in vista da solo quando cambia da fuori (un link, la ricerca).
 */
export function DayStrip({
  days,
  selected,
  onSelect,
  marks,
}: {
  days: string[];
  selected: string;
  onSelect: (day: string) => void;
  /** Per ogni giorno: quante partite, e se ce n'è una da confermare. */
  marks: Map<string, { total: number; pending: boolean }>;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: si riallinea quando cambia il giorno scelto.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [selected]);

  return (
    <div
      role="tablist"
      aria-label="Giorno"
      className="-mx-4 flex snap-x scroll-px-4 gap-1 overflow-x-auto px-4 pb-1 md:scroll-px-6 [scrollbar-width:none] md:-mx-6 md:px-6 [&::-webkit-scrollbar]:hidden"
    >
      {days.map((day) => {
        const isSelected = day === selected;
        const mark = marks.get(day);

        return (
          <button
            key={day}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={`${dayLabel(day)}${
              mark
                ? `, ${mark.total} ${mark.total === 1 ? "partita" : "partite"}`
                : ""
            }`}
            onClick={() => onSelect(day)}
            className="group flex w-11 shrink-0 snap-start flex-col items-center gap-1 py-1 outline-none"
          >
            <span className="text-muted-foreground text-[11px] font-medium uppercase">
              {weekdayInitial(day)}
            </span>
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full text-[15px] font-medium tabular-nums transition-[background-color,color,transform] duration-150 group-active:scale-90 group-focus-visible:ring-2 group-focus-visible:ring-ring",
                isSelected
                  ? "bg-foreground text-background"
                  : "group-hover:bg-muted",
              )}
            >
              {dayOfMonth(day)}
            </span>
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                !mark && "invisible",
                mark?.pending ? "bg-warning" : "bg-foreground/30",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
