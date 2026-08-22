"use client";

import { SchedulePicker } from "@/components/booking/schedule-picker";
import { StepHeader } from "@/components/booking/wizard-ui";
import type { BookingDay, TimeSlot } from "@/lib/booking";
import { formatDuration, MATCH_DURATION_MINUTES } from "@/lib/booking";

/**
 * Quando si gioca. Gli orari sono gli stessi della pagina di prenotazione —
 * `useCourtAvailability` toglie quelli passati e quelli in cui tutti i campi
 * sono già occupati — perché una richiesta di giocatori per un orario in cui
 * non c'è campo libero non porta da nessuna parte.
 */
export function ScheduleStep({
  step,
  totalSteps,
  days,
  slotsByDay,
  dayIndex,
  time,
  loading,
  noCourts,
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
  noCourts?: boolean;
  onSelectDay: (index: number) => void;
  onSelectTime: (time: string) => void;
}) {
  return (
    <div>
      <StepHeader
        step={step}
        total={totalSteps}
        title="Per quando?"
        subtitle="Vedi solo i giorni e gli orari con un campo ancora libero."
      />

      <SchedulePicker
        days={days}
        slotsByDay={slotsByDay}
        dayIndex={dayIndex}
        time={time}
        loading={loading}
        noCourts={noCourts}
        onSelectDay={onSelectDay}
        onSelectTime={onSelectTime}
        hint={
          <>
            Una partita dura {formatDuration(MATCH_DURATION_MINUTES)}. Il campo
            non è ancora prenotato: lo blocchiamo noi quando la squadra è al
            completo.
          </>
        }
      />
    </div>
  );
}
