"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { ClientDetailView } from "../_components/client-sheet";
import { hasClientsReturn } from "../_components/clients-panel";
import type { ClientTab } from "../_components/types";

/**
 * La scheda di un cliente a tutta pagina: da telefono è dove porta il tocco
 * su una riga dell'elenco, da desktop il tasto che allarga il pannello.
 *
 * «Clienti» torna indietro davvero quando si arriva dall'elenco: così si
 * ritrova la lista com'era (ricerca, filtri, punto di scorrimento) e il gesto
 * di sistema fa la stessa cosa del tasto. Arrivando da un link diretto non
 * c'è niente dietro, e il tasto porta all'elenco.
 */
export function ClientPage({
  playerId,
  initialTab,
  from,
}: {
  playerId: string;
  initialTab?: ClientTab;
  /**
   * Da dove si arriva, quando non è l'elenco: da «Assegna punti» o dalla
   * scheda di una prenotazione in agenda. Il tasto torna lì.
   */
  from?: "points" | "agenda";
}) {
  const router = useRouter();

  const backToList = () => {
    if (from || hasClientsReturn()) router.back();
    else router.push("/clients");
  };

  return (
    <>
      <button
        type="button"
        onClick={backToList}
        className="text-muted-foreground hover:text-foreground -ml-1 inline-flex min-h-10 items-center gap-0.5 text-[15px] transition-colors"
      >
        <ChevronLeft className="size-5" />
        {from === "points" ? "Punti" : from === "agenda" ? "Agenda" : "Clienti"}
      </button>

      <ClientDetailView
        playerId={playerId}
        initialTab={initialTab}
        active
        variant="page"
        onSaved={() => router.refresh()}
        onRemoved={() => router.push("/clients")}
      />
    </>
  );
}
