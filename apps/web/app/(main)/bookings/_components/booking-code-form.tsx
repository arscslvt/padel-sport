"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FIELD_CLASS } from "@/components/booking/wizard-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Scorciatoia per chi il codice ce l'ha già: i compagni di squadra non hanno
 * un account, quindi la verifica via email non li riconoscerebbe, ma il codice
 * gliel'ha passato chi ha prenotato.
 *
 * Non controlla se il codice esista: ci pensa la pagina di destinazione, che
 * risponde 404 come farebbe con un indirizzo scritto a mano.
 */
export function BookingCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const open = () => {
    const normalized = code.trim().toUpperCase();
    if (normalized) router.push(`/booking/${normalized}`);
  };

  return (
    <div className="rounded-card bg-muted p-6 sm:p-8">
      <p className="text-sm font-medium">Hai già il codice?</p>
      <p className="text-muted-foreground mt-1 max-w-[52ch] text-sm">
        Sono le sei cifre della conferma. Aprono il QR d'ingresso anche a chi
        non ha un account: basta averlo ricevuto da chi ha prenotato.
      </p>

      <div className="mt-4 flex flex-col gap-2.5 sm:max-w-sm sm:flex-row">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              open();
            }
          }}
          placeholder="Es. 7F2K9Q"
          maxLength={12}
          autoCapitalize="characters"
          className={`${FIELD_CLASS} font-mono tracking-[0.15em] uppercase`}
        />
        <Button
          type="button"
          size="pill"
          disabled={!code.trim()}
          onClick={open}
          className="shrink-0"
        >
          Apri
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
