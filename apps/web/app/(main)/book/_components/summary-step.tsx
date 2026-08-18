"use client";

import { Hint, StepHeader, SummaryRow } from "@/components/booking/wizard-ui";
import type { BookingDay } from "@/lib/booking";
import { formatDayLong, formatSlotRange, MAX_PLAYERS } from "@/lib/booking";
import type { BookingPartner } from "@/lib/booking-form";
import { formatLevelRange, LEVEL_RANGES } from "@/lib/levels";

/** Ultimo sguardo prima di occupare il campo. Ogni riga riporta al suo passo. */
export function SummaryStep({
  step,
  totalSteps,
  day,
  time,
  levelIndex,
  bookerName,
  phone,
  notes,
  partners,
  onEdit,
}: {
  step: number;
  totalSteps: number;
  day: BookingDay;
  time: string;
  levelIndex: number;
  bookerName: string;
  phone: string;
  notes?: string;
  partners: BookingPartner[];
  onEdit: (step: number) => void;
}) {
  const level = LEVEL_RANGES[levelIndex];
  const squadSize = 1 + partners.length;
  const missing = MAX_PLAYERS - squadSize;

  return (
    <div>
      <StepHeader
        step={step}
        total={totalSteps}
        title="Tutto pronto?"
        subtitle="Controlla il riepilogo e conferma la prenotazione."
      />

      <div className="border-border rounded-2xl border px-4">
        <SummaryRow
          label="Data"
          value={formatDayLong(day.date)}
          onEdit={() => onEdit(1)}
        />
        <SummaryRow
          label="Orario"
          value={formatSlotRange(time)}
          onEdit={() => onEdit(1)}
        />
        <SummaryRow
          label="Livello richiesto"
          value={`${formatLevelRange(level.min, level.max)} · ${level.label}`}
          onEdit={() => onEdit(2)}
        />
        <SummaryRow
          label={`Giocatori ${squadSize}/${MAX_PLAYERS}`}
          value={
            <ul className="flex flex-col gap-0.5">
              <li>{bookerName} · prenoti tu</li>
              {partners.map((partner) => (
                <li key={partner.name}>
                  {partner.name}
                  {partner.email ? ` · ${partner.email}` : ""}
                </li>
              ))}
            </ul>
          }
          onEdit={() => onEdit(3)}
        />
        <SummaryRow label="Telefono" value={phone} onEdit={() => onEdit(4)} />
        {notes && (
          <SummaryRow
            label="Note alla struttura"
            value={notes}
            onEdit={() => onEdit(4)}
          />
        )}
      </div>

      {missing > 0 && (
        <Hint>
          Confermando occupi il campo. {missing === 1 ? "Manca" : "Mancano"}{" "}
          {missing === 1 ? "un giocatore" : `${missing} giocatori`}: ci pensiamo
          noi a cercare chi gioca al vostro livello, e potremmo chiamarti per
          definire gli ultimi dettagli.
        </Hint>
      )}
    </div>
  );
}
