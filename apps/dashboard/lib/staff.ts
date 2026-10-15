import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import {
  STAFF_ADMIN_ROLE,
  STAFF_DENIED_PATH,
  STAFF_ORG_SLUG,
} from "@/lib/clerk";

export { STAFF_ADMIN_ROLE };

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

  const staff = memberships.data.find(
    (membership) => membership.organization.slug === STAFF_ORG_SLUG,
  );

  return {
    slugs,
    isStaff: Boolean(staff),
    /** Il ruolo nell'organizzazione staff (`org:admin`, `org:member`…). */
    role: staff?.role ?? null,
    organizationId: staff?.organization.id ?? null,
  };
}

/** I ruoli che si possono dare dal gestionale. */
export const STAFF_ROLES = ["org:member", STAFF_ADMIN_ROLE] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * Variante per le pagine: senza sessione si finisce al login (`auth.protect`,
 * lo stesso meccanismo del middleware su `/`), senza tessera staff
 * alla pagina che spiega perché. Non ritorna mai a chi non è autorizzato.
 *
 * Il rimbalzo silenzioso alla home che c'era prima costava caro: un'istanza
 * Clerk sbagliata e nessuno poteva più entrare, senza un rigo da nessuna parte
 * che dicesse quale organizzazione mancava.
 */
export async function requireStaffMember() {
  return (await requireStaffMembership()).userId;
}

/** Come `requireStaffMember`, con in più il ruolo: serve al profilo. */
export async function requireStaffMembership() {
  const { userId } = await auth.protect();
  const { isStaff, slugs, role } = await staffMembership(userId);

  if (!isStaff) {
    console.warn(
      `[staff] accesso negato a ${userId}: manca l'organizzazione "${STAFF_ORG_SLUG}". Organizzazioni dell'utente: ${slugs.join(", ") || "nessuna"}.`,
    );
    redirect(STAFF_DENIED_PATH);
  }

  return { userId, role };
}
