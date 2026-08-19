/**
 * Il segreto condiviso fra il sito e questo deployment.
 *
 * Convex non sa chi è lo staff: quello lo sa Clerk, attraverso l'organizzazione.
 * Le operazioni riservate alla struttura passano quindi da una route Next che
 * verifica la sessione (lib/dashboard-api.ts) e poi chiama qui portando il
 * segreto. Due serrature in fila: senza la prima chiunque potrebbe chiamare la
 * mutation, senza la seconda basterebbe conoscere l'URL del deployment, che è
 * pubblico.
 */
export function assertServer(secret: string): void {
  const expected = process.env.BOOKING_WEBHOOK_SECRET;

  if (!expected || secret !== expected) {
    throw new Error("Operazione non consentita.");
  }
}
