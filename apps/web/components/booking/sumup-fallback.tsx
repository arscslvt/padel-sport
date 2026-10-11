"use client";

import { useAuth } from "@clerk/nextjs";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SUMUP_BOOKING_URL } from "@/lib/links";

/**
 * Via d'uscita verso la prenotazione tradizionale, sempre visibile sotto al
 * modulo.
 *
 * Sta fuori dal riquadro di proposito: chi non ha un account non deve prima
 * sbattere contro la verifica per scoprire che una strada c'è: la vede da
 * subito, senza che rubi la scena a quella principale.
 *
 * Chi è già entrato l'account ce l'ha: per lui SumUp non è un ripiego ma un
 * altro modo di pagare, online e subito invece che in sede. Finché Clerk non
 * ha risposto non mostriamo niente, per non far lampeggiare il testo sbagliato.
 */
export function SumUpFallback() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;

  return (
    <div className="border-border mt-2.5 flex flex-col gap-4 rounded-2xl border border-dashed px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      {isSignedIn ? (
        <div>
          <p className="text-sm font-medium">Preferisci pagare online?</p>
          <p className="text-muted-foreground mt-1 max-w-[52ch] text-sm leading-relaxed">
            Puoi prenotare anche dal nostro servizio esterno e saldare subito
            con la carta, invece di pagare in sede. Quella prenotazione però non
            compare nella tua area personale.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium">Non hai un account del club?</p>
          <p className="text-muted-foreground mt-1 max-w-[52ch] text-sm leading-relaxed">
            Prenoti lo stesso dal nostro servizio esterno, senza registrarti.
            Per avere QR, squadra e storico delle partite, chiedici di attivarti
            l'account.
          </p>
        </div>
      )}

      <Button asChild variant="outline" size="pill" className="sm:shrink-0">
        <a href={SUMUP_BOOKING_URL} target="_blank" rel="noreferrer">
          {isSignedIn ? "Prenota e paga con SumUp" : "Prenota con SumUp"}
          <ExternalLink className="size-4" />
        </a>
      </Button>
    </div>
  );
}
