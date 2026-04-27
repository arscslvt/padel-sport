import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { STAFF_ORG_SLUG } from "@/lib/clerk";
import BookingsDashboard from "./_components/bookings-dashboard";

export default async function DashboardPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: "/dashboard" });
  }

  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({
    userId,
    limit: 100,
    offset: 0,
  });

  const isStaffMember = memberships.data.some(
    (membership) => membership.organization.slug === STAFF_ORG_SLUG,
  );

  if (!isStaffMember) {
    redirect("/");
  }

  return <BookingsDashboard />;
}
