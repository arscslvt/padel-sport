/**
 * Gli aiuti del sito per le route che parlano dei clienti.
 *
 * Le parti che servivano solo al gestionale — chi è dello staff, le identità
 * Clerk dell'anagrafica — sono passate con lui in `apps/dashboard`.
 */

/** Il messaggio dentro l'errore Convex, che altrimenti arriva incapsulato. */
export function convexMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  // Il sito chiama una funzione che il deployment non ha ancora: succede quando
  // il codice di Convex non è stato pubblicato. Dirlo, invece del messaggio
  // generico, risparmia di cercare il guasto nel posto sbagliato.
  const missing = error.message.match(
    /Could not find public function for '([^']+)'/,
  )?.[1];
  if (missing) {
    return `Il backend non è aggiornato: manca la funzione ${missing}. Pubblica le modifiche di Convex e riprova.`;
  }

  return (
    error.message.match(/Uncaught Error: (.*?)(?:\n| at )/)?.[1] ?? fallback
  );
}
