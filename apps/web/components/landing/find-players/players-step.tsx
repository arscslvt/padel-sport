"use client";

import {
  Chip,
  ChoiceCard,
  SectionLabel,
  StepHeader,
} from "@/components/booking/wizard-ui";
import {
  LEVELS,
  type MatchRequestLevel,
  MISSING_PLAYERS,
  type MissingPlayers,
} from "@/lib/match-request";

/**
 * Il primo passo chiede la sola cosa che l'utente sa già senza pensarci:
 * quante persone gli mancano. È anche la domanda che dà un senso a tutte le
 * altre, e per questo apre il modulo.
 *
 * Il livello sta qui e non in un passo suo: è la seconda metà della stessa
 * domanda — chi cerchiamo — e da solo non varrebbe una schermata.
 */
const MISSING_COPY: Record<MissingPlayers, string> = {
  "1": "Siete in tre, manca l'ultimo.",
  "2": "Siete in due: serve l'altra coppia.",
  "3": "Giochi da solo, la squadra la troviamo noi.",
};

export function PlayersStep({
  step,
  totalSteps,
  missing,
  level,
  onSelectMissing,
  onSelectLevel,
}: {
  step: number;
  totalSteps: number;
  /** Nessun default: sceglie l'utente, non scegliamo noi per lui. */
  missing?: MissingPlayers;
  level?: MatchRequestLevel;
  onSelectMissing: (missing: MissingPlayers) => void;
  onSelectLevel: (level: MatchRequestLevel) => void;
}) {
  return (
    <div>
      <StepHeader
        step={step}
        total={totalSteps}
        title="Quanti giocatori cerchi?"
        subtitle="Partiamo da qui: al resto pensiamo dopo."
      />

      <div className="flex flex-col gap-2.5">
        {MISSING_PLAYERS.map((count) => (
          <ChoiceCard
            key={count}
            title={count === "1" ? "1 giocatore" : `${count} giocatori`}
            description={MISSING_COPY[count]}
            selected={missing === count}
            onClick={() => onSelectMissing(count)}
          />
        ))}
      </div>

      <div className="mt-8">
        <SectionLabel>Livello di gioco</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((entry) => (
            <Chip
              key={entry.value}
              selected={level === entry.value}
              onClick={() => onSelectLevel(entry.value)}
            >
              {entry.label}
            </Chip>
          ))}
        </div>
        <p className="text-muted-foreground mt-3 text-sm">
          Serve a proporti compagni con cui la partita resti equilibrata.
        </p>
      </div>
    </div>
  );
}
