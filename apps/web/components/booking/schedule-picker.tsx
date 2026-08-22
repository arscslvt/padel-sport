"use client";

import type { ReactNode } from "react";

import {
  Chip,
  DayChip,
  Hint,
  SectionLabel,
} from "@/components/booking/wizard-ui";
import type { BookingDay, TimeSlot } from "@/lib/booking";
import { groupSlots } from "@/lib/booking";

/**
 * La griglia giorno + orario, senza sapere a cosa serva.
 *
 * La usano il wizard di /book e il modulo «cerco giocatori» della home: gli
 * orari sono gli stessi — quelli in cui un campo è ancora libero, calcolati da
 * `useCourtAvailability` — mentre cambia il testo attorno, che ogni flusso
 * passa con `hint`.
 */
export function SchedulePicker({
  days,
  slotsByDay,
  dayIndex,
  time,
  loading,
  noCourts,
  onSelectDay,
  onSelectTime,
  hint,
}: {
  days: BookingDay[];
  slotsByDay: TimeSlot[][];
  dayIndex: number | null;
  time: string | null;
  loading: boolean;
  /** Nessun campo configurato: senza, la griglia si svuoterebbe in silenzio. */
  noCourts?: boolean;
  onSelectDay: (index: number) => void;
  onSelectTime: (time: string) => void;
  hint?: ReactNode;
}) {
  const slots = dayIndex === null ? [] : slotsByDay[dayIndex];
  const groups = groupSlots(slots);

  return (
    <div>
      <SectionLabel>Giorno</SectionLabel>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {days.map((day, index) => (
          <DayChip
            key={day.date.toISOString()}
            label={day.label}
            dayNumber={day.dayNumber}
            selected={dayIndex === index}
            disabled={!loading && slotsByDay[index].length === 0}
            onClick={() => onSelectDay(index)}
          />
        ))}
      </div>

      <div className="mt-8">
        <SectionLabel>Orario di inizio</SectionLabel>

        {noCourts ? (
          <p className="text-muted-foreground text-sm">
            Nessun campo è al momento disponibile alla prenotazione online.
            Chiamaci: la struttura può prenotare per te.
          </p>
        ) : dayIndex === null ? (
          <p className="text-muted-foreground text-sm">
            Scegli prima il giorno.
          </p>
        ) : loading ? (
          <p className="text-muted-foreground text-sm">
            Controlliamo i campi liberi…
          </p>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Per questo giorno non ci sono più orari disponibili: scegline un
            altro.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="text-muted-foreground mb-2 text-sm">
                  {group.title}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.slots.map((slot) => (
                    <Chip
                      key={slot.time}
                      selected={time === slot.time}
                      onClick={() => onSelectTime(slot.time)}
                    >
                      {slot.time}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}
