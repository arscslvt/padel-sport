/**
 * Organizzazione Clerk che dà accesso alla dashboard.
 *
 * Deve stare in una variabile d'ambiente perché **le organizzazioni non
 * attraversano le istanze**: quella di sviluppo (chiavi `pk_test_`) e quella di
 * produzione (`pk_live_`, servita da clerk.asdpadelsport.com) sono due
 * installazioni separate, con utenti e organizzazioni propri. Uno slug scritto
 * nel codice vale in una sola delle due — e in produzione fa fallire il
 * controllo per tutti, senza dire perché.
 *
 * Il valore di riserva è lo slug dell'istanza di sviluppo, così in locale
 * funziona senza configurare niente.
 */
export const STAFF_ORG_SLUG =
  process.env.STAFF_ORG_SLUG || "staff-1777286296213413378";

/** Il ruolo che può aggiungere e togliere persone dallo staff. */
export const STAFF_ADMIN_ROLE = "org:admin";

/** Il ruolo nell'organizzazione staff, detto come lo direbbe il club. */
export function staffRoleLabel(role: string | null | undefined): string {
  return role === STAFF_ADMIN_ROLE ? "Amministratore" : "Staff";
}

/** Dove finisce chi ha una sessione valida ma non è dello staff. */
export const STAFF_DENIED_PATH = "/accesso-negato";
