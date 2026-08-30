import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireStaffMember } from "@/lib/staff";

import { TemplatesPanel } from "../_components/templates-panel";

/** I template cambiano quando qualcuno li scrive: mai serviti dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardTemplatesPage() {
  await requireStaffMember();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard/social">
          <ArrowLeft className="size-4" />
          Social
        </Link>
      </Button>

      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Template</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Le frasi con i buchi da cui nascono i contenuti che si ripetono. Le
          scrive l'IA una volta sola, su valori inventati — non vede mai nomi di
          giocatori né dati del circolo — e le leggi tu prima che entrino in
          circolo. Da lì in poi il sistema riempie i buchi da solo, senza
          chiedere niente a nessuno.
        </p>
      </section>

      <TemplatesPanel />
    </div>
  );
}
