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
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <ClientPage playerId={playerId} />
    </div>
  );
}
