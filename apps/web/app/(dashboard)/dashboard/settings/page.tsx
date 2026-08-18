import { requireStaffMember } from "@/lib/staff";

import { BookingSettings } from "./_components/booking-settings";

/** Le impostazioni cambiano da sotto: mai servite dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage() {
  await requireStaffMember();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Configurazione</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Come si presenta la prenotazione online: quali campi si possono
          prenotare e in quali giorni e fasce orarie. Vale per il sito e per
          l'app.
        </p>
      </section>

      <BookingSettings />
    </div>
  );
}
