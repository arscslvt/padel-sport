"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FIELD_CLASS } from "@/components/booking/wizard-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Scorciatoia per chi il codice ce l'ha già: i compagni di squadra non hanno
 * un account, quindi la verifica via email non li riconoscerebbe, ma il codice
 * gliel'ha passato chi ha prenotato.
 *
 * Non controlla se il codice esista: ci pensa la pagina di destinazione, che
 * risponde 404 come farebbe con un indirizzo scritto a mano.
 */
export function BookingCodeForm({
  bare = false,
}: {
  /** Senza pannello: per quando sta già dentro una colonna che lo inquadra. */
  bare?: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");

  const open = () => {
    const normalized = code.trim().toUpperCase();
    if (normalized) router.push(`/booking/${normalized}`);
  };

  return (
    <div className={cn(!bare && "rounded-card bg-muted p-6 sm:p-8")}>
      <p className="text-sm font-medium">Hai un codice di prenotazione?</p>
      <p className="text-muted-foreground mt-1 max-w-[52ch] text-sm">
        Inseriscilo per vedere la partita e il QR d'ingresso. Non serve un
        account.
      </p>

      <div
        className={cn(
          "mt-4 flex flex-col gap-2.5 sm:flex-row",
          !bare && "sm:max-w-sm",
        )}
      >
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
