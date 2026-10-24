"use client";

import { format } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { it } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { EASE_OUT, UI_DURATION } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Da telefono, la striscia dei giorni che si apre in un calendario.
 *
 * Il pulsante calendario non apre un pannello sopra l'agenda: è la striscia
 * stessa che si allunga in verticale, si scurisce e diventa il mese intero,
 * nello stesso posto. Si capisce che è la stessa cosa vista più da lontano.
 * Un tocco su un giorno porta lì e la richiude.
 *
 * Il movimento segue poche regole: l'altezza si misura e si anima davvero
 * (niente `scale`, che deformerebbe il testo), la curva è un ease-out deciso
 * e breve, e i due contenuti si scambiano sfumando nella sfocatura invece di
 * scorrere. Il fondo passa dal chiaro allo scuro con la stessa curva. Chi ha
 * chiesto meno animazioni vede solo la dissolvenza.
 */

const OPEN_MS = 300;

/** L'altezza del contenuto, aggiornata a ogni cambio: è ciò che si anima. */
function useHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.contentRect.height),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, height] as const;
}

export function DayNavigator({
  expanded,
  selected,
  lastDay,
  booked,
  onPick,
  children,
}: {
  expanded: boolean;
  /** Il giorno che si sta guardando, "AAAA-MM-GG". */
  selected: string;
  /** L'ultimo giorno della striscia: dopo non c'è niente da guardare. */
  lastDay: string;
  /** I giorni con almeno una partita, per il puntino sotto il numero. */
  booked: readonly string[];
  onPick: (day: string) => void;
  /** Quel che c'è da chiusa: la striscia, o il ritorno a oggi. */
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [content, height] = useHeight<HTMLDivElement>();

  const swap = {
    initial: reduce
      ? { opacity: 0 }
      : { opacity: 0, filter: "blur(6px)", y: expanded ? -8 : 8 },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: { duration: OPEN_MS / 1000, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      ...(reduce ? {} : { filter: "blur(6px)" }),
      transition: { duration: UI_DURATION.exit, ease: EASE_OUT },
    },
  };

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={
        reduce ? { duration: 0 } : { duration: OPEN_MS / 1000, ease: EASE_OUT }
      }
      className={cn(
        "relative overflow-hidden transition-[background-color,border-radius,margin] duration-300 ease-(--ease-out) motion-reduce:transition-none",
        // Da chiusa arriva ai bordi dello schermo come la striscia; aperta è
        // una scheda dentro i margini della pagina.
        expanded
          ? "bg-foreground text-background mx-0 rounded-3xl"
          : "-mx-4 rounded-none md:-mx-6",
      )}
    >
      <div ref={content}>
        <AnimatePresence mode="popLayout" initial={false}>
          {expanded ? (
            <motion.div key="calendar" {...swap} className="p-3">
              <MonthCalendar
                selected={selected}
                lastDay={lastDay}
                booked={booked}
                onPick={onPick}
              />
            </motion.div>
          ) : (
            <motion.div key="strip" {...swap} className="px-4 md:px-6">
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * Il mese, chiaro su scuro. Il calendario di shadcn parla i colori della
 * pagina: qui si rovesciano, dal giorno scelto (chiaro, pieno) ai giorni
 * fuori portata (spenti).
 */
function MonthCalendar({
  selected,
  lastDay,
  booked,
  onPick,
}: {
  selected: string;
  lastDay: string;
  booked: readonly string[];
  onPick: (day: string) => void;
}) {
  const current = new Date(`${selected}T12:00:00`);
  const last = new Date(`${lastDay}T12:00:00`);
  const bookedDates = booked.map((day) => new Date(`${day}T12:00:00`));

  return (
    <div className="flex flex-col gap-2">
      <Calendar
        mode="single"
        locale={it}
        weekStartsOn={1}
        required
        selected={current}
        defaultMonth={current}
        endMonth={last}
        disabled={{ after: last }}
        modifiers={{ booked: bookedDates }}
        modifiersClassNames={{
          // Il puntino della striscia, anche qui: c'è qualcosa in agenda.
          booked:
            "after:bg-background/50 after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full",
        }}
        onSelect={(date) => {
          if (date) onPick(format(date, "yyyy-MM-dd"));
        }}
        className={cn(
          "w-full bg-transparent p-0 [--cell-size:--spacing(10)]",
          // Su scuro: numeri chiari, il giorno scelto pieno e chiaro.
          "[&_button]:text-background [&_button:hover]:bg-background/10!",
          "[&_[data-selected-single=true]]:bg-background! [&_[data-selected-single=true]]:text-foreground!",
          "[&_.rdp-outside_button]:text-background/35 [&_.rdp-disabled_button]:text-background/25",
          "[&_.rdp-weekday]:text-background/55",
        )}
        classNames={{
          week: "mt-1 flex w-full",
          // Oggi, quando non è il giorno scelto: un anello, non un fondo.
          today: "[&>button]:ring-1 [&>button]:ring-background/40",
          day: "relative flex-1 p-0 text-center select-none [&>button]:aspect-auto [&>button]:h-10 [&>button]:w-full",
        }}
      />
      <Button
        variant="ghost"
        className="text-background hover:bg-background/10 hover:text-background h-10 self-center rounded-full px-4"
        onClick={() => onPick(format(new Date(), "yyyy-MM-dd"))}
      >
        Oggi
      </Button>
    </div>
  );
}
