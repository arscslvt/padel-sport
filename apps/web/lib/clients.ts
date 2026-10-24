/**
 * Gli aiuti del sito per le route che parlano dei clienti.
 *
 * Le parti che servivano solo al gestionale — chi è dello staff, le identità
 * Clerk dell'anagrafica — sono passate con lui in `apps/dashboard`.
 */

import { ConvexError } from "convex/values";

/** Il messaggio dentro l'errore Convex, che altrimenti arriva incapsulato. */
export function convexMessage(error: unknown, fallback: string): string {
  // Un `ConvexError` porta il testo nei dati, e lo porta anche in produzione,
  // dove invece il messaggio di un errore qualunque viene nascosto.
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object" && "message" in data) {
      const { message } = data as { message: unknown };
      if (typeof message === "string") return message;
    }
  }

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
