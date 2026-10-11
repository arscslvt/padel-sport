/**
 * Le forme dei dati anagrafici che la persona completa attivando l'account.
 *
 * Sono le stesse di `apps/dashboard/app/clients/_components/types.ts`: il
 * gestionale ora è un'app a sé e le due copie vanno tenute allineate a mano.
 */

/** Dove abita il socio: si scrive e si corregge tutto insieme. */
export interface Residence {
  address?: string;
  city?: string;
  postalCode?: string;
}

/** Dati sanitari: categoria particolare, si vedono solo aprendo una scheda. */
export interface Health {
  allergies?: string;
  conditions?: string;
  disability?: string;
}
