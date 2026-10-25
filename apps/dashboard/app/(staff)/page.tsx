import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import { firstNameOf } from "@/lib/first-name";
import { requireStaffMembership, STAFF_ADMIN_ROLE } from "@/lib/staff";

import { Agenda } from "../_components/agenda/agenda";

/** Le prenotazioni arrivano di continuo: mai servite dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Chi apre la pagina, per il saluto del titolo (agenda/greeting.tsx): letto
  // qui, insieme al controllo sullo staff e non dopo, così la pagina non
  // aspetta una chiamata in più. Arriva già scritto nella pagina, senza
  // aspettare che Clerk si carichi nel browser.
  const [{ role }, user] = await Promise.all([
    requireStaffMembership(),
    currentUser(),
  ]);
  const viewer = user ? { id: user.id, firstName: firstNameOf(user) } : null;

  // L'agenda legge `?booking=` e `?tab=` per aprirsi dove la notifica
  // indicava, e Next vuole `useSearchParams` dentro un confine di Suspense.
  return (
    <Suspense fallback={null}>
      {/* Chiudere il club per maltempo, dal meteo, spetta agli amministratori. */}
      <Agenda viewer={viewer} canClose={role === STAFF_ADMIN_ROLE} />
    </Suspense>
  );
}
