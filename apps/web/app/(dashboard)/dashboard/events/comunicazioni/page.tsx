import {
  PageBody,
  PageHeader,
} from "@/app/(dashboard)/_components/page-header";
import { requireStaffMember } from "@/lib/staff";
import Communications from "./_components/communications";

/** Una comunicazione appena pubblicata deve comparire subito: mai dalla cache. */
export const dynamic = "force-dynamic";

export default async function CommunicationsPage() {
  await requireStaffMember();

  return (
    <>
      <PageHeader
        title="Comunicazioni"
        description="Le comunicazioni pubblicate nello Studio, da inviare agli iscritti. L'invio non si richiama."
      />
      <PageBody>
        <Communications />
      </PageBody>
    </>
  );
}
