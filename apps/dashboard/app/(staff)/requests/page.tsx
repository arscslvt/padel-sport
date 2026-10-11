import { Suspense } from "react";
import { PageBody, PageHeader } from "@/app/_components/page-header";
import { requireStaffMember } from "@/lib/staff";
import { RequestsPanel } from "./_components/requests-panel";

/** Le richieste arrivano di continuo: mai servite dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardRequestsPage() {
  await requireStaffMember();

  return (
    <>
      <PageHeader
        title="Richieste"
        description="Assistenza, ricerca compagni e segnalazioni sui punti arrivate dal sito: qui chi aspetta ancora una risposta."
      />
      <PageBody>
        {/* Il pannello legge `?support=`, `?match=` e `?report=` per aprirsi già sulla
          richiesta che la notifica indicava, e Next vuole `useSearchParams`
          dentro un confine di Suspense. */}
        <Suspense fallback={null}>
          <RequestsPanel />
        </Suspense>
      </PageBody>
    </>
  );
}
