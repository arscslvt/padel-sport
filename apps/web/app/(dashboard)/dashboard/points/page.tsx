import {
  PageBody,
  PageHeader,
} from "@/app/(dashboard)/_components/page-header";
import { requireStaffMember } from "@/lib/staff";
import { AssignPoints } from "./_components/assign-points";
import { PointsPanel } from "./_components/points-panel";

/** Riscatti e catalogo cambiano di continuo: mai serviti dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardPointsPage() {
  await requireStaffMember();

  return (
    <>
      <PageHeader
        title="Punti e premi"
        description="Catalogo premi, causali dei punti e premi riscattati da consegnare."
        actions={<AssignPoints />}
      />
      {/* Da telefono «Assegna punti» fluttua sopra la barra in basso: il
          fondo della pagina gli lascia spazio, l'ultima card resta libera. */}
      <PageBody className="pb-20 md:pb-6">
        <PointsPanel />
      </PageBody>
    </>
  );
}
