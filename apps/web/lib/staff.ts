import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { STAFF_DENIED_PATH, STAFF_ORG_SLUG } from "@/lib/clerk";

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
export async function staffMembership(userId: string) {
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: 100,
    offset: 0,
  });

  const slugs = memberships.data
    .map((membership) => membership.organization.slug)
    .filter((slug): slug is string => Boolean(slug));

  return { slugs, isStaff: slugs.includes(STAFF_ORG_SLUG) };
}

export async function isStaffMember(userId: string) {
  return (await staffMembership(userId)).isStaff;
}

/**
 * Variante per le pagine: senza sessione si finisce al login (`auth.protect`,
 * lo stesso meccanismo del middleware su `/dashboard`), senza tessera staff
 * alla pagina che spiega perché. Non ritorna mai a chi non è autorizzato.
 *
 * Il rimbalzo silenzioso alla home che c'era prima costava caro: un'istanza
 * Clerk sbagliata e nessuno poteva più entrare, senza un rigo da nessuna parte
 * che dicesse quale organizzazione mancava.
 */
export async function requireStaffMember() {
  const { userId } = await auth.protect();
  const { isStaff, slugs } = await staffMembership(userId);

  if (!isStaff) {
    console.warn(
      `[staff] accesso negato a ${userId}: manca l'organizzazione "${STAFF_ORG_SLUG}". Organizzazioni dell'utente: ${slugs.join(", ") || "nessuna"}.`,
    );
    redirect(STAFF_DENIED_PATH);
  }

  return userId;
}
