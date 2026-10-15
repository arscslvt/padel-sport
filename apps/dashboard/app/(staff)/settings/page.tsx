import { PageBody, PageHeader } from "@/app/_components/page-header";
import { requireStaffMembership, STAFF_ADMIN_ROLE } from "@/lib/staff";
import { SettingsTabs } from "./_components/settings-tabs";

/** Le impostazioni cambiano da sotto: mai servite dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { role } = await requireStaffMembership();
  const isAdmin = role === STAFF_ADMIN_ROLE;
  const { tab } = await searchParams;

  return (
    <>
      <PageHeader
        title="Configurazione"
        description={
          isAdmin
            ? "Le tue notifiche e la prenotazione online di sito e app."
            : "Le tue notifiche. Orari, campi e regole li cambia un amministratore."
        }
      />
      <PageBody>
        <SettingsTabs initialTab={tab} isAdmin={isAdmin} />
      </PageBody>
    </>
  );
}
