import { requireStaffMember } from "@/lib/staff";
import { ClientsPanel } from "./_components/clients-panel";

/** L'anagrafica cambia di continuo: mai servita dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardClientsPage() {
  await requireStaffMember();

  // Intestazione e corpo li disegna il pannello: da telefono il pulsante del
  // nuovo cliente sta nell'intestazione e apre un modulo del pannello.
  return <ClientsPanel />;
}
