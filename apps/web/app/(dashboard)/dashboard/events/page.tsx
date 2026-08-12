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
    <div className="space-y-6 p-4 md:p-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Eventi</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Chi ha segnalato la propria presenza agli eventi pubblicati sul sito.
          Compaiono qui solo gli eventi in cui è stato inserito un modulo di
          iscrizione dallo Studio.
        </p>
      </section>
      <Participations events={events} />
    </div>
  );
}
