"use client";

import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { it } from "react-day-picker/locale";
import { useMediaQuery } from "usehooks-ts";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Il pulsante calendario dell'agenda: porta a un giorno qualsiasi fino a
 * oggi, anche passato. I giorni dopo ci sono già nella striscia.
 *
 * Da desktop il calendario si apre attaccato al pulsante, in un popover
 * senza cornici in più. Da telefono il pulsante apre e chiude la striscia dei
 * giorni, che diventa lei stessa il calendario (day-navigator.tsx). Il tocco
 * su un giorno porta lì e chiude. All'apertura il fuoco va sul giorno che si
 * sta guardando, non sulla freccia del mese.
 */
export function DayPickerButton({
  selected,
  today,
  active,
  expanded,
  onToggle,
  onPick,
}: {
  /** Il giorno che si sta guardando, "AAAA-MM-GG". */
  selected: string;
  today: string;
  /** Si sta guardando un giorno passato: il pulsante resta acceso. */
  active: boolean;
  /** Da telefono: la striscia è aperta a calendario. */
  expanded: boolean;
  onToggle: () => void;
  onPick: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)", {
    initializeWithValue: false,
  });

  const pick = (day: string) => {
    setOpen(false);
    onPick(day);
  };

  const trigger = (
    <Button
      variant={active || (!isDesktop && expanded) ? "default" : "secondary"}
      size="icon"
      className="size-10 rounded-full"
      aria-label="Vai a un giorno"
      aria-expanded={isDesktop ? open : expanded}
      onClick={isDesktop ? undefined : onToggle}
    >
      <CalendarDays className="size-5" />
    </Button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-auto rounded-2xl p-2"
          // Il fuoco lo porta il calendario sul giorno scelto (`autoFocus`).
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DayCalendar selected={selected} today={today} onPick={pick} />
        </PopoverContent>
      </Popover>
    );
  }

  return trigger;
}

function DayCalendar({
  selected,
  today,
  onPick,
}: {
  selected: string;
  today: string;
  onPick: (day: string) => void;
}) {
  const current = new Date(`${selected}T12:00:00`);
  const last = new Date(`${today}T12:00:00`);

  return (
    <Calendar
      mode="single"
      locale={it}
      weekStartsOn={1}
      required
      autoFocus
      selected={current}
      defaultMonth={current}
      endMonth={last}
      disabled={{ after: last }}
      onSelect={(date) => {
        if (date) onPick(format(date, "yyyy-MM-dd"));
      }}
      // Larga sette celle e non di più: con le celle quadrate, un calendario
      // steso su tutto il pannello diventa anche altissimo. Da telefono le
      // celle restano da pollice.
      className="w-[calc(var(--cell-size)*7)] bg-transparent p-0 [--cell-size:--spacing(10)] md:[--cell-size:--spacing(9)]"
      classNames={{ week: "mt-1 flex w-full" }}
    />
  );
}
