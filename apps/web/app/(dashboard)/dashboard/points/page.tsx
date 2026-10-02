import { requireStaffMember } from "@/lib/staff";

import { PointsPanel } from "./_components/points-panel";

/** Riscatti e catalogo cambiano di continuo: mai serviti dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardPointsPage() {
  await requireStaffMember();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Punti e premi</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          I premi che i clienti sbloccano con i punti, le causali con cui li
          carichi e i premi riscattati da consegnare allo sportello. I punti di
          una persona si caricano dalla sua scheda in Clienti.
        </p>
      </section>

      <PointsPanel />
    </div>
  );
}
