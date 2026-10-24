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
 * Un giorno in cui il club è chiuso ha il numero spento e barrato.
 */
export function DayStrip({
  days,
  selected,
  onSelect,
  marks,
  closed,
}: {
  days: string[];
  selected: string;
  onSelect: (day: string) => void;
  /** Per ogni giorno: quante partite, e se ce n'è una da confermare. */
  marks: Map<string, { total: number; pending: boolean }>;
  /** I giorni in cui il club è chiuso. */
  closed?: ReadonlySet<string>;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Solo di lato, dentro la striscia: `scrollIntoView` farebbe scorrere anche
  // ciò che la contiene, e un modulo in un drawer si aprirebbe a metà.
  // biome-ignore lint/correctness/useExhaustiveDependencies: si riallinea quando cambia il giorno scelto.
  useEffect(() => {
    const strip = stripRef.current;
    const day = selectedRef.current;
    if (!strip || !day) return;

    strip.scrollTo({
      left: day.offsetLeft - (strip.clientWidth - day.offsetWidth) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [selected]);

  return (
    <div
      ref={stripRef}
      role="tablist"
      aria-label="Giorno"
      data-tour="agenda-days"
      // Scorre di lato da sé: non sposta la giornata sotto (day-pager.tsx).
      data-swipe-ignore
      className="relative -mx-4 flex snap-x scroll-px-4 gap-1 overflow-x-auto px-4 pb-1 md:scroll-px-6 [scrollbar-width:none] md:-mx-6 md:px-6 [&::-webkit-scrollbar]:hidden"
    >
      {days.map((day) => {
        const isSelected = day === selected;
        const mark = marks.get(day);
        const isClosed = closed?.has(day) ?? false;

        return (
          <button
            key={day}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={`${dayLabel(day)}${isClosed ? ", club chiuso" : ""}${
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
                  ? "bg-primary text-primary-foreground"
                  : "group-hover:bg-muted",
                isClosed &&
                  !isSelected &&
                  "text-muted-foreground/60 decoration-muted-foreground/50 line-through",
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
