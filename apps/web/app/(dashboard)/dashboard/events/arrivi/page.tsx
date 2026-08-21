import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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
    <div className="space-y-6 p-4 md:p-6">
      <section className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/events">
            <ArrowLeft className="size-4" />
            Eventi
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Arrivi</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          L'appello all'ingresso: si spunta chi si presenta, iscritti e
          accompagnatori uno per uno. Le spunte si salvano da sole, quindi la
          pagina si può ricaricare o passare a un altro telefono senza perdere
          niente. Da qui non si annulla nessuna iscrizione.
        </p>
      </section>
      <Arrivals events={events} />
    </div>
  );
}
