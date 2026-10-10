import {
  PageBody,
  PageHeader,
} from "@/app/(dashboard)/_components/page-header";
import { requireStaffMember } from "@/lib/staff";
import { client } from "@/sanity/client";
import { EVENTS_WITH_RSVP_QUERY } from "@/sanity/queries";
import type { EventWithRsvpForms } from "@/sanity/types";
import Arrivals from "./_components/arrivals";

/** Chi si presenta alla cassa cambia di minuto in minuto: mai dalla cache. */
export const dynamic = "force-dynamic";

export default async function EventArrivalsPage() {
  await requireStaffMember();

  const events = await client.fetch<EventWithRsvpForms[]>(
    EVENTS_WITH_RSVP_QUERY,
  );

  return (
    <>
      <PageHeader
        title="Arrivi"
        description="L'appello all'ingresso: le spunte si salvano da sole, anche fra più telefoni."
      />
      <PageBody>
        <Arrivals events={events} />
      </PageBody>
    </>
  );
}
