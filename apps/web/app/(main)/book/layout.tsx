import type { ReactNode } from "react";

/**
 * Ponte di tono: il modulo di prenotazione non è ancora stato ridisegnato e il
 * suo markup usa `text-white` ed emerald letterali. `tone-legacy` gli restituisce
 * la vecchia palette teal finché non verrà rifatto.
 */
export default function BookLayout({ children }: { children: ReactNode }) {
  return <div className="tone-legacy min-h-svh">{children}</div>;
}
