import { requireStaffMember } from "@/lib/staff";

import { ClientPage } from "./client-page";

/** L'anagrafica cambia di continuo: mai servita dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardClientPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  await requireStaffMember();
  const { playerId } = await params;

  return (
    // In alto lo spazio dell'incavo dell'iPhone: la dashboard si disegna fin
    // sotto la barra di stato, e il «Clienti» per tornare non ci deve finire.
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:p-6">
      <ClientPage playerId={playerId} />
    </div>
  );
}
