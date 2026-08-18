import "server-only";

import { auth } from "@clerk/nextjs/server";

/**
 * Token con cui chiamare Convex a nome dell'utente della richiesta.
 *
 * Clerk può parlare con Convex in due modi, e quale sia dipende da come è
 * configurata l'istanza:
 *
 * - integrazione nativa: il token di sessione porta già `aud: "convex"` e va
 *   usato così com'è;
 * - modo storico: serve un template JWT chiamato `convex`, e chiederlo a
 *   un'istanza che non ce l'ha non restituisce `null` ma solleva un 404
 *   («No JWT template exists with name: convex»), cioè fa fallire la route.
 *
 * Nel browser la scelta la fa `ConvexProviderWithClerk`; qui la rifacciamo
 * uguale, con il ripiego sul token di sessione, così le due istanze del club
 * (sviluppo e produzione) restano intercambiabili.
 */
export async function convexSessionToken(): Promise<string | null> {
  const { getToken, sessionClaims } = await auth();

  // `aud` è singolo o multiplo a seconda di come Clerk emette il token.
  const audience = sessionClaims?.aud;
  const isConvexAudience = Array.isArray(audience)
    ? audience.includes("convex")
    : audience === "convex";

  if (isConvexAudience) {
    return await getToken();
  }

  try {
    const templated = await getToken({ template: "convex" });
    if (templated) return templated;
  } catch {
    // Nessun template: l'istanza usa l'integrazione nativa.
  }

  return await getToken();
}
