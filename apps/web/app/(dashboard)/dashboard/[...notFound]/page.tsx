import { notFound } from "next/navigation";

import { requireStaffMember } from "@/lib/staff";

/**
 * Raccoglie qualunque indirizzo sotto `/dashboard` che non corrisponda a una
 * pagina vera.
 *
 * Senza, un `not-found.tsx` in questa cartella non basterebbe: quel file è un
 * confine per chi chiama `notFound()`, ma un indirizzo che non corrisponde a
 * nessuna rotta non entra mai in questo segmento — Next non ha modo di sapere
 * quale guscio applicargli, e ripiega sulla 404 della radice. Facendo
 * *corrispondere* l'indirizzo, il guscio della dashboard viene scelto, e da lì
 * `notFound()` trova il confine giusto.
 *
 * Le rotte vere non ne risentono: a parità di indirizzo Next preferisce sempre
 * un segmento preciso a uno che cattura tutto.
 *
 * Il controllo dello staff resta anche qui, e non è pignoleria: senza,
 * qualunque utente autenticato vedrebbe la barra laterale dell'area riservata
 * scrivendo un indirizzo a caso. Non leggerebbe alcun dato, ma vedrebbe la
 * forma di ciò che non gli compete.
 */
export default async function DashboardCatchAll() {
  await requireStaffMember();

  notFound();
}
