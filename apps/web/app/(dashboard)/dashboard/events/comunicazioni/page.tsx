import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireStaffMember } from "@/lib/staff";
import Communications from "./_components/communications";

/** Una comunicazione appena pubblicata deve comparire subito: mai dalla cache. */
export const dynamic = "force-dynamic";

export default async function CommunicationsPage() {
  await requireStaffMember();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/events">
            <ArrowLeft className="size-4" />
            Eventi
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Comunicazioni</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Le comunicazioni scritte nello Studio e pubblicate, pronte da mandare
          agli iscritti dell'evento a cui si riferiscono. Pubblicare non invia
          niente: l'invio parte solo da qui, e non si può richiamare indietro.
        </p>
      </section>
      <Communications />
    </div>
  );
}
