import { requireStaffMember } from "@/lib/staff";
import { PointsPanel } from "./_components/points-panel";

/** Riscatti e catalogo cambiano di continuo: mai serviti dalla cache. */
export const dynamic = "force-dynamic";

/**
 * Intestazione e corpo li disegna il pannello: il «+» del premio nuovo
 * dipende dalla linguetta aperta (points-panel.tsx).
 */
export default async function DashboardPointsPage() {
  await requireStaffMember();

  return <PointsPanel />;
}
