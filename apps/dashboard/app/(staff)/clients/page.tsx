import {
  PageBody,
  PageHeader,
} from "@/app/_components/page-header";
import { requireStaffMember } from "@/lib/staff";
import { ClientsPanel } from "./_components/clients-panel";

/** L'anagrafica cambia di continuo: mai servita dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardClientsPage() {
  await requireStaffMember();

  return (
    <>
      <PageHeader
        title="Clienti"
        description="Anagrafica, tessera annuale, account e punti di chi frequenta il club."
      />
      <PageBody>
        <ClientsPanel />
      </PageBody>
    </>
  );
}
