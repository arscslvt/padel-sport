import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { requireStaffMember } from "@/lib/staff";

import { SocialPanel } from "./_components/social-panel";

/** Le bozze cambiano da sole, a ogni ora: mai servite dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardSocialPage() {
  await requireStaffMember();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Social</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Quello che il circolo sta per dire su Instagram. I contenuti che
            riportano fatti — campi liberi, risultati, partite che cercano
            giocatori — escono da soli; quelli scritti di sana pianta aspettano
            il tuo via libera. Una volta pubblicato, si toglie solo da
            Instagram.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/social/templates">Templates</Link>
        </Button>
      </section>

      {/* Il pannello legge `?post=` per aprirsi già sulla bozza che l'avviso
          indicava, e Next vuole `useSearchParams` dentro un confine di Suspense. */}
      <Suspense fallback={null}>
        <SocialPanel />
      </Suspense>
    </div>
  );
}
