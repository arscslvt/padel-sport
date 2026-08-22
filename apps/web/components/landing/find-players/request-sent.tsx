"use client";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";

/**
 * Esito della richiesta. Prende il posto del modulo invece di svuotarlo: un
 * form che torna bianco dopo l'invio sembra averlo perso.
 */
export function RequestSent({
  summary,
  notified,
  onReset,
}: {
  /** Cosa abbiamo capito: cosa cerca e per quando. */
  summary: string;
  /** La copia via email è partita davvero. */
  notified: boolean;
  onReset: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        Richiesta inviata
      </p>
      <Heading as="h2" size="section" className="mt-2">
        Ci pensiamo noi
      </Heading>

      <p className="mt-3 text-sm">{summary}</p>

      <p className="text-muted-foreground mx-auto mt-4 max-w-[52ch] text-sm leading-relaxed">
        {notified
          ? "Ti abbiamo mandato una copia via email. Ti avvisiamo appena il match è al completo."
          : "Ti avvisiamo appena il match è al completo."}
      </p>

      <Button
        type="button"
        variant="outline"
        size="pill"
        className="mt-8"
        onClick={onReset}
      >
        Invia un'altra richiesta
      </Button>
    </div>
  );
}
