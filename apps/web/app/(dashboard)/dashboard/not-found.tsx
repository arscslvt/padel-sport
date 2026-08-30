import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * 404 dell'area riservata.
 *
 * Esiste perché un indirizzo sbagliato dentro `/dashboard` finiva sulla pagina
 * pubblica di errore: si perdeva la barra laterale, e chi ci arrivava si
 * ritrovava improvvisamente sul sito con l'impressione di essere stato buttato
 * fuori. Qui il guscio resta — arriva da `layout.tsx` — e si rende solo il
 * contenuto, altrimenti la navigazione comparirebbe due volte.
 */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[70dvh] items-center justify-center p-4 md:p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Pagina non trovata</EmptyTitle>
          <EmptyDescription>
            Questo indirizzo non esiste, o non esiste più. Se ci sei arrivato da
            un avviso, la cosa che cercavi potrebbe essere stata spostata.
          </EmptyDescription>
        </EmptyHeader>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Torna al riepilogo
          </Link>
        </Button>
      </Empty>
    </div>
  );
}
