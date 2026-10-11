import { SignOutButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth-routes";
import { staffMembership } from "@/lib/staff";

export const metadata: Metadata = {
  title: "Accesso riservato",
};

/**
 * Dove finisce chi ha fatto il login ma non è nell'organizzazione staff.
 *
 * Non chiama `requireStaffMember`: sarebbe un rimbalzo su se stessa. Mostra le
 * organizzazioni a cui l'account appartiene davvero, perché la causa più
 * probabile (un account che sta in un'istanza Clerk e non nell'altra) da fuori
 * è indistinguibile da un bug.
 */
export default async function StaffDeniedPage() {
  const { userId } = await auth.protect();
  const user = await currentUser();
  const { slugs } = await staffMembership(userId);

  return (
    <div>
      <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] lg:text-[32px]">
        Accesso riservato
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Questo account non fa parte dello staff.
      </p>

      <dl className="mt-8 divide-y rounded-xl border bg-card text-sm">
        <div className="flex flex-wrap justify-between gap-2 px-4 py-3">
          <dt className="text-muted-foreground">Account</dt>
          <dd className="font-medium break-all">
            {user?.primaryEmailAddress?.emailAddress ?? userId}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2 px-4 py-3">
          <dt className="text-muted-foreground">Organizzazioni</dt>
          <dd className="font-medium">
            {slugs.length ? slugs.join(", ") : "nessuna"}
          </dd>
        </div>
      </dl>

      <SignOutButton redirectUrl={SIGN_IN_PATH}>
        <Button className="mt-6 h-12 w-full rounded-xl bg-club text-[15px] font-medium text-club-foreground transition-[transform,background-color] duration-150 hover:bg-club-hover focus-visible:ring-club/30 active:scale-[0.98]">
          Cambia account
        </Button>
      </SignOutButton>
    </div>
  );
}
