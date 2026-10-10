import {
  PageBody,
  PageHeader,
} from "@/app/(dashboard)/_components/page-header";
import { requireStaffMember } from "@/lib/staff";
import { client } from "@/sanity/client";
import { EVENTS_WITH_RSVP_QUERY } from "@/sanity/queries";
import type { EventWithRsvpForms } from "@/sanity/types";
import Participations from "./_components/participations";

/** L'elenco dei moduli cambia quando un evento viene pubblicato: mai dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardEventsPage() {
  await requireStaffMember();

  const events = await client.fetch<EventWithRsvpForms[]>(
    EVENTS_WITH_RSVP_QUERY,
  );

  return (
    <>
      <PageHeader
        title="Iscrizioni"
        description="Chi ha segnalato la propria presenza agli eventi con modulo di iscrizione."
      />
      <PageBody>
        <Participations events={events} />
      </PageBody>
    </>
  );
}
