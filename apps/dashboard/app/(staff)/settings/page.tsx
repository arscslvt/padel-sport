import { PageBody, PageHeader } from "@/app/_components/page-header";
import { requireStaffMember } from "@/lib/staff";
import { SettingsTabs } from "./_components/settings-tabs";

/** Le impostazioni cambiano da sotto: mai servite dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireStaffMember();
  const { tab } = await searchParams;

  return (
    <>
      <PageHeader
        title="Configurazione"
        description="Le tue notifiche e la prenotazione online di sito e app."
      />
      <PageBody>
        <SettingsTabs initialTab={tab} />
      </PageBody>
    </>
  );
}
