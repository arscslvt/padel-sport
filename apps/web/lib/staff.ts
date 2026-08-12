import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { STAFF_ORG_SLUG } from "@/lib/clerk";

/**
 * Chi è staff e chi no, in un posto solo.
 *
 * Il controllo è sull'appartenenza all'organizzazione Clerk, non su un ruolo
 * dell'utente: le pagine della dashboard e la route che serve il pannello
 * dentro lo Studio facevano già la stessa chiamata, copiata due volte.
 *
 * `server-only`: qui dentro c'è il client Clerk lato server, non deve finire
 * per sbaglio in un bundle del browser.
 */
export async function isStaffMember(userId: string) {
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: 100,
    offset: 0,
  });

  return memberships.data.some(
    (membership) => membership.organization.slug === STAFF_ORG_SLUG,
  );
}

/**
 * Variante per le pagine: senza sessione si finisce al login (`auth.protect`,
 * lo stesso meccanismo del middleware su `/dashboard`), senza tessera staff
 * alla home. Non ritorna mai a chi non è autorizzato.
 */
export async function requireStaffMember() {
  const { userId } = await auth.protect();

  if (!(await isStaffMember(userId))) {
    redirect("/");
  }

  return userId;
}
