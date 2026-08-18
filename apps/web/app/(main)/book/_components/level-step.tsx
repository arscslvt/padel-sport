"use client";

import { ChoiceCard, Hint, StepHeader } from "@/components/booking/wizard-ui";
import { formatLevelRange, LEVEL_RANGES } from "@/lib/levels";

/**
 * Fascia di livello della partita: è quella che il club usa per cercare i
 * giocatori mancanti, quindi si chiede anche a chi la squadra ce l'ha già
 * completa — finisce sulla prenotazione e la staff la legge in dashboard.
 */
export function LevelStep({
  step,
  totalSteps,
  levelIndex,
  playerLevel,
  onSelect,
}: {
  step: number;
  totalSteps: number;
  levelIndex: number;
  playerLevel?: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div>
      <StepHeader
        step={step}
        total={totalSteps}
        title="Che livello cerchi?"
        subtitle="Di default usiamo il tuo, ma puoi cambiarlo."
      />

      <div className="flex flex-col gap-2.5">
        {LEVEL_RANGES.map((range, index) => (
          <ChoiceCard
            key={range.label}
            title={range.label}
            description={range.hint}
            badge={formatLevelRange(range.min, range.max)}
            selected={levelIndex === index}
            onClick={() => onSelect(index)}
          />
        ))}
      </div>

      {playerLevel != null && (
        <Hint>
          Sul tuo profilo risulta il livello {playerLevel.toFixed(1)}: abbiamo
          pre-selezionato la fascia più adatta.
        </Hint>
      )}
    </div>
  );
}
