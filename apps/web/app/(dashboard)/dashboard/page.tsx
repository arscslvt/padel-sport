import { Suspense } from "react";

import { requireStaffMember } from "@/lib/staff";

import { Agenda } from "./_components/agenda/agenda";

/** Le prenotazioni arrivano di continuo: mai servite dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireStaffMember();

  // L'agenda legge `?booking=` e `?tab=` per aprirsi dove la notifica
  // indicava, e Next vuole `useSearchParams` dentro un confine di Suspense.
  return (
    <Suspense fallback={null}>
      <Agenda />
    </Suspense>
  );
}
