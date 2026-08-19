import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { STAFF_ORG_SLUG } from "@/lib/clerk";

/**
 * Gli id Clerk di chi è dello staff.
 *
 * Servono a togliere lo staff dall'elenco clienti: Convex non sa chi lavora
 * qui, e l'organizzazione è l'unica cosa che lo dice. La lista è di una
 * decina di persone, quindi una chiamata sola basta e avanza.
 *
 * In caso di errore torna un elenco vuoto invece di far fallire la pagina:
 * peggio che vedere il proprio profilo fra i clienti c'è solo una dashboard che
 * non si apre.
 */
export async function staffClerkUserIds(): Promise<string[]> {
  try {
    const clerk = await clerkClient();

    const organizations = await clerk.organizations.getOrganizationList({
      limit: 100,
    });

    const staffOrg = organizations.data.find(
      (organization) => organization.slug === STAFF_ORG_SLUG,
    );

    if (!staffOrg) {
      console.warn(
        `[clients] organizzazione "${STAFF_ORG_SLUG}" non trovata: nessuno escluso dall'elenco.`,
      );
      return [];
    }

    const memberships = await clerk.organizations.getOrganizationMembershipList(
      { organizationId: staffOrg.id, limit: 100 },
    );

    return memberships.data
      .map((membership) => membership.publicUserData?.userId)
      .filter((userId): userId is string => Boolean(userId));
  } catch (error) {
    console.error("Elenco dello staff non recuperato:", error);
    return [];
  }
}

export interface ClerkIdentity {
  email?: string;
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Identità su Clerk di un gruppo di persone, in una chiamata (o poche).
 *
 * L'email non sta su Convex per chi si è registrato dall'app: sta solo qui. La
 * dashboard la mostrerebbe come «non disponibile» pur avendola sotto il naso,
 * e soprattutto la ricerca per indirizzo non troverebbe nessuno.
 *
 * Clerk accetta cento id per volta: l'anagrafica di un circolo ci sta in una
 * manciata di richieste, e chi non risponde semplicemente resta com'era.
 */
export async function clerkIdentities(
  userIds: string[],
): Promise<Map<string, ClerkIdentity>> {
  const identities = new Map<string, ClerkIdentity>();
  if (userIds.length === 0) return identities;

  try {
    const clerk = await clerkClient();

    for (let index = 0; index < userIds.length; index += 100) {
      const chunk = userIds.slice(index, index + 100);

      const { data } = await clerk.users.getUserList({
        userId: chunk,
        limit: chunk.length,
      });

      for (const user of data) {
        identities.set(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          avatarUrl: user.hasImage ? user.imageUrl : undefined,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
        });
      }
    }
  } catch (error) {
    // Senza Clerk l'elenco resta quello di Convex: incompleto, non rotto.
    console.error("Identità Clerk non recuperate:", error);
  }

  return identities;
}

/** Il messaggio dentro l'errore Convex, che altrimenti arriva incapsulato. */
export function convexMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  return (
    error.message.match(/Uncaught Error: (.*?)(?:\n| at )/)?.[1] ?? fallback
  );
}
