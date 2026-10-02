"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { ClientDetailView } from "../_components/client-sheet";

/**
 * La scheda di un cliente a tutta pagina. Il ritorno porta all'elenco con la
 * stessa persona in evidenza, così chi era partito da lì ritrova il filo.
 */
export function ClientPage({ playerId }: { playerId: string }) {
  const router = useRouter();

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard/clients">
          <ArrowLeft className="size-4" />
          Clienti
        </Link>
      </Button>

      <ClientDetailView
        playerId={playerId}
        active
        variant="page"
        onSaved={() => router.refresh()}
        onRemoved={() => router.push("/dashboard/clients")}
      />
    </>
  );
}
