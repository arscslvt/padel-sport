"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Clock } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * La striscia della manutenzione (modules/clubs/status.ts).
 *
 * Il gestionale resta aperto: le letture funzionano, le scritture le rifiuta
 * Convex con il suo messaggio. La striscia dice prima di provarci cosa si può
 * fare, e all'amministratore della piattaforma che per lui si salva.
 */
export function MaintenanceBanner() {
  const status = useQuery(api.modules.clubs.status.default, {});
  if (!status?.maintenance) return null;

  return (
    <div className="px-4 pt-4 md:px-6">
      <Alert className="border-warning-border bg-warning-subtle text-warning-foreground">
        <Clock />
        <AlertTitle>Manutenzione in corso</AlertTitle>
        <AlertDescription className="text-warning-foreground/90">
          {status.bypass
            ? "Lavori come amministratore della piattaforma, quindi le modifiche si salvano. Lo staff può solo consultare."
            : "Puoi consultare il gestionale. Le modifiche tornano disponibili fra poco."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
