"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import type React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";

/**
 * La manutenzione del club vista dal sito (modules/clubs/status.ts).
 *
 * In manutenzione Convex rifiuta le scritture, quindi si ferma solo quello
 * che con Convex parla: le pagine dell'elenco in `(main)/layout.tsx` e i
 * moduli dentro le pagine vetrina. Il resto del sito resta com'è.
 *
 * Finché lo stato non è arrivato si mostra la pagina: un lampo di «Torniamo
 * subito» a ogni caricamento sarebbe peggio di un errore raro. Chi è
 * amministratore della piattaforma passa, con una striscia che glielo ricorda.
 */
function useMaintenance() {
  const status = useQuery(api.modules.clubs.status.default, {});
  return {
    paused: status?.maintenance === true && !status.bypass,
    bypass: status?.bypass === true,
  };
}

/** Per un amministratore in manutenzione: il sito lavora, i clienti aspettano. */
function MaintenanceStrip() {
  return (
    <p className="bg-muted text-muted-foreground px-4 py-2 text-center text-sm">
      Manutenzione in corso. I clienti vedono la pagina di attesa.
    </p>
  );
}

/** Al posto di una pagina che lavora con le prenotazioni. */
export function MaintenancePage({ children }: { children: React.ReactNode }) {
  const { paused, bypass } = useMaintenance();

  if (!paused) {
    return (
      <>
        {bypass && <MaintenanceStrip />}
        {children}
      </>
    );
  }

  return (
    <div className="page-container flex min-h-[70dvh] items-center pt-10 pb-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <p className="text-muted-foreground border-border rounded-full border px-4 py-1 text-xs tracking-[0.18em] uppercase">
          Manutenzione
        </p>

        <div className="space-y-4">
          <Heading as="h1" size="page">
            Torniamo subito.
          </Heading>
          <p className="text-muted-foreground mx-auto max-w-xl text-pretty sm:text-lg">
            Stiamo aggiornando il sistema delle prenotazioni. Fra poco puoi
            tornare a prenotare e a usare la tua area personale.
          </p>
        </div>

        <Button asChild size="pill-lg">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Torna alla home
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Al posto di un modulo dentro una pagina vetrina, che resta visibile. */
export function MaintenanceForm({ children }: { children: React.ReactNode }) {
  const { paused } = useMaintenance();

  if (!paused) return children;

  return (
    <Alert>
      <Clock />
      <AlertTitle>Torniamo subito</AlertTitle>
      <AlertDescription>
        Stiamo aggiornando il sistema. Fra poco puoi inviare la richiesta.
      </AlertDescription>
    </Alert>
  );
}
