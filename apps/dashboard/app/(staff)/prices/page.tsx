import { PageBody, PageHeader } from "@/app/_components/page-header";
import { requireStaffMembership, STAFF_ADMIN_ROLE } from "@/lib/staff";
import { PriceList } from "./_components/price-list";

/** I prezzi cambiano da sotto: mai serviti dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardPricesPage() {
  const { role } = await requireStaffMembership();

  return (
    <>
      <PageHeader
        title="Listino"
        description="Quanto costano i servizi che si prenotano dal sito, dall'app e allo sportello."
      />
      <PageBody>
        <PriceList canEdit={role === STAFF_ADMIN_ROLE} />
      </PageBody>
    </>
  );
}
