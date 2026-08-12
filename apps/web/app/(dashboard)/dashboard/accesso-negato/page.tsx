import { auth, currentUser } from "@clerk/nextjs/server";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { staffMembership } from "@/lib/staff";

/**
 * Dove finisce chi ha fatto il login ma non è nell'organizzazione staff.
 *
 * Non chiama `requireStaffMember`: sarebbe un rimbalzo su se stessa. Mostra a
 * chi legge le organizzazioni a cui appartiene davvero, perché la causa più
 * probabile — un account che sta in un'istanza Clerk e non nell'altra — da
 * fuori è indistinguibile da un bug.
 */
export default async function StaffDeniedPage() {
  const { userId } = await auth.protect();
  const user = await currentUser();
  const { slugs } = await staffMembership(userId);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <ShieldAlert className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold">Accesso riservato allo staff</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        L'accesso è andato a buon fine, ma questo account non fa parte
        dell'organizzazione che abilita la dashboard.
      </p>

      <dl className="rounded-xl border bg-muted/20 p-4 text-sm">
        <div className="flex flex-wrap justify-between gap-2 py-1">
          <dt className="text-muted-foreground">Account</dt>
          <dd className="font-medium">
            {user?.primaryEmailAddress?.emailAddress ?? userId}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2 py-1">
          <dt className="text-muted-foreground">Organizzazioni</dt>
          <dd className="font-medium">
            {slugs.length ? slugs.join(", ") : "nessuna"}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-muted-foreground">
        Se dovresti avere accesso, l'account va aggiunto all'organizzazione
        dello staff su Clerk — attenzione all'istanza: quella di produzione è
        separata da quella di sviluppo, e le organizzazioni non passano dall'una
        all'altra.
      </p>

      <Button asChild variant="outline">
        <Link href="/">Torna al sito</Link>
      </Button>
    </div>
  );
}
