import { Suspense } from "react";
import { requireStaffMember } from "@/lib/staff";
import BookingsDashboard from "./_components/bookings-dashboard";

export default async function DashboardPage() {
  await requireStaffMember();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Gestione prenotazioni</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Visualizza le richieste in arrivo e conferma gli slot da incassare in
          struttura.
        </p>
      </section>
      {/* L'agenda legge `?booking=` e `?tab=` per aprirsi già sulla scheda che
          la notifica indicava, e Next vuole `useSearchParams` dentro un
          confine di Suspense: senza, la pagina non si prerenderizza. */}
      <Suspense fallback={null}>
        <BookingsDashboard />
      </Suspense>
    </div>
  );
}
