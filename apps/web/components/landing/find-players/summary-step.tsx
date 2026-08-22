"use client";

import type { Control } from "react-hook-form";

import { StepHeader, SummaryRow } from "@/components/booking/wizard-ui";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { BookingDay } from "@/lib/booking";
import { formatDayLong, formatSlotRange } from "@/lib/booking";
import type {
  MatchRequestLevel,
  MatchRequestValues,
  MissingPlayers,
} from "@/lib/match-request";
import { levelLabel, missingPlayersLabel } from "@/lib/match-request";

/**
 * Riepilogo e note. Le note vivono qui e non in un passo loro perché sono
 * facoltative: chiederle prima le farebbe sembrare un campo da compilare,
 * mentre a questo punto sono solo l'ultima cosa che si può aggiungere.
 */
export function SummaryStep({
  step,
  totalSteps,
  control,
  day,
  time,
  missing,
  level,
  name,
  email,
  phone,
  onEdit,
}: {
  step: number;
  totalSteps: number;
  control: Control<MatchRequestValues>;
  day: BookingDay;
  time: string;
  missing: MissingPlayers;
  level: MatchRequestLevel;
  name: string;
  email: string;
  phone: string;
  onEdit: (step: number) => void;
}) {
  return (
    <div>
      <StepHeader
        step={step}
        total={totalSteps}
        title="Tutto giusto?"
        subtitle="Controlla il riepilogo, aggiungi una nota se serve e invia."
      />

      <div className="border-border rounded-2xl border px-4">
        <SummaryRow
          label="Cerchi"
          value={`${missingPlayersLabel(Number(missing))} · livello ${levelLabel(
            level,
          ).toLowerCase()}`}
          onEdit={() => onEdit(1)}
        />
        <SummaryRow
          label="Quando"
          value={`${formatDayLong(day.date)}, ${formatSlotRange(time)}`}
          onEdit={() => onEdit(2)}
        />
        <SummaryRow
          label="Contatti"
          value={
            <ul className="flex flex-col gap-0.5">
              <li>{name}</li>
              <li className="text-muted-foreground">{email}</li>
              <li className="text-muted-foreground">{phone}</li>
            </ul>
          }
          onEdit={() => onEdit(3)}
        />
      </div>

      <div className="mt-6">
        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Note{" "}
                <span className="text-muted-foreground font-normal">
                  (facoltative)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Qualcosa che dovremmo sapere?"
                  className="bg-background border-border min-h-24 rounded-xl"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
