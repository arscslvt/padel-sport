import { PageBody, PageHeader } from "@/app/_components/page-header";
import { requireStaffMember } from "@/lib/staff";
import { BookingSettings } from "./_components/booking-settings";
import { NotificationSettings } from "./_components/notification-settings";

/** Le impostazioni cambiano da sotto: mai servite dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage() {
  await requireStaffMember();

  return (
    <>
      <PageHeader
        title="Configurazione"
        description="Le tue notifiche, e campi, giorni e orari della prenotazione online per sito e app."
      />
      <PageBody className="space-y-10">
        <NotificationSettings />
        <BookingSettings />
      </PageBody>
    </>
  );
}
