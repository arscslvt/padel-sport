"use client";

import {
  Chip,
  DayChip,
  Hint,
  SectionLabel,
  StepHeader,
} from "@/components/booking/wizard-ui";
import type { BookingDay, TimeSlot } from "@/lib/booking";
import {
  formatDuration,
  groupSlots,
  MATCH_DURATION_MINUTES,
} from "@/lib/booking";

/**
 * Giorno e orario di inizio. La durata non si sceglie: le partite durano
 * novanta minuti e il campo lo assegna la struttura.
 *
 * Gli orari mostrati sono già quelli liberi: `booking-wizard.tsx` incrocia le
 * finestre di apertura con le prenotazioni esistenti. La disponibilità vera
 * resta comunque verificata alla conferma, lato Convex.
 */
export function ScheduleStep({
  step,
  totalSteps,
  days,
  slotsByDay,
  dayIndex,
  time,
  loading,
  onSelectDay,
  onSelectTime,
}: {
  step: number;
  totalSteps: number;
  days: BookingDay[];
  slotsByDay: TimeSlot[][];
  dayIndex: number | null;
  time: string | null;
  loading: boolean;
  onSelectDay: (index: number) => void;
  onSelectTime: (time: string) => void;
}) {
  const slots = dayIndex === null ? [] : slotsByDay[dayIndex];
  const groups = groupSlots(slots);

  return (
    <div>
      <StepHeader
        step={step}
        total={totalSteps}
        title="Quando vuoi giocare?"
        subtitle="Scegli il giorno e l'orario di inizio."
      />

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

        {dayIndex === null ? (
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

      <Hint>
        Ogni partita dura {formatDuration(MATCH_DURATION_MINUTES)}. Il campo
        viene assegnato dalla struttura alla conferma.
      </Hint>
    </div>
  );
}
