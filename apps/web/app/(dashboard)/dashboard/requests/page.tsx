import { Suspense } from "react";

import { requireStaffMember } from "@/lib/staff";

import { RequestsPanel } from "./_components/requests-panel";

/** Le richieste arrivano di continuo: mai servite dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardRequestsPage() {
  await requireStaffMember();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Richieste</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Chi ha scritto dai moduli del sito: assistenza e ricerca di compagni
          di partita. La mail resta il canale con cui si risponde, questa è la
          lista di chi aspetta ancora una risposta.
        </p>
      </section>

      {/* Il pannello legge `?support=` e `?match=` per aprirsi già sulla
          richiesta che la notifica indicava, e Next vuole `useSearchParams`
          dentro un confine di Suspense. */}
      <Suspense fallback={null}>
        <RequestsPanel />
      </Suspense>
    </div>
  );
}
