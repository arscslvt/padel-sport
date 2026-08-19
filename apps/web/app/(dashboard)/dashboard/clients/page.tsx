import { requireStaffMember } from "@/lib/staff";

import { ClientsPanel } from "./_components/clients-panel";

/** L'anagrafica cambia di continuo: mai servita dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardClientsPage() {
  await requireStaffMember();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Clienti</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Chi frequenta il club: anagrafica, tessera annuale e pagamenti. Al
          club si entra su invito — da qui inviti una persona e lei completa da
          sé la propria iscrizione.
        </p>
      </section>

      <ClientsPanel />
    </div>
  );
}
