import type { Metadata } from "next";

import { PageBody, PageHeader } from "@/app/_components/page-header";
import { staffRoleLabel } from "@/lib/clerk";
import { requireStaffMembership, STAFF_ADMIN_ROLE } from "@/lib/staff";

import { ProfileView } from "./_components/profile-view";

export const metadata: Metadata = { title: "Profilo" };

/** I dati dell'account cambiano da Clerk: mai serviti dalla cache. */
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { role } = await requireStaffMembership();
  const isAdmin = role === STAFF_ADMIN_ROLE;

  return (
    <>
      <PageHeader
        title="Profilo"
        description="Come ti vede il resto dello staff, e come entri nel gestionale."
      />
      <PageBody>
        <ProfileView role={staffRoleLabel(role)} isAdmin={isAdmin} />
      </PageBody>
    </>
  );
}
