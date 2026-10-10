import {
  PageBody,
  PageHeader,
} from "@/app/(dashboard)/_components/page-header";
import { requireStaffMember } from "@/lib/staff";
import { BookingSettings } from "./_components/booking-settings";

/** Le impostazioni cambiano da sotto: mai servite dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage() {
  await requireStaffMember();

  return (
    <>
      <PageHeader
        title="Configurazione"
        description="Campi, giorni e orari della prenotazione online, per sito e app."
      />
      <PageBody>
        <BookingSettings />
      </PageBody>
    </>
  );
}
