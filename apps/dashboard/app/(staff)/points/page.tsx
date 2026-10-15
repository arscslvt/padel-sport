import { requireStaffMembership, STAFF_ADMIN_ROLE } from "@/lib/staff";
import { PointsPanel } from "./_components/points-panel";

/** Riscatti e catalogo cambiano di continuo: mai serviti dalla cache. */
export const dynamic = "force-dynamic";

/**
 * Intestazione e corpo li disegna il pannello: il «+» del premio nuovo
 * dipende dalla linguetta aperta (points-panel.tsx).
 */
export default async function DashboardPointsPage() {
  const { role } = await requireStaffMembership();

  return <PointsPanel canManageRewards={role === STAFF_ADMIN_ROLE} />;
}
