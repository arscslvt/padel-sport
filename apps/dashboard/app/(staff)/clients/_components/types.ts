/**
 * Le forme che arrivano da `/api/dashboard/clients`.
 *
 * Sono scritte a mano invece di dedurle da Convex perché passano da una route:
 * il tipo generato descrive la query, non quello che il browser riceve.
 */

export type MembershipState =
  | "none"
  | "unpaid"
  | "expiring"
  | "active"
  | "expired";

export type Gender = "f" | "m" | "other" | "unspecified";

/**
 * A che punto è l'account: `none` è chi allo sportello ha lasciato solo i
 * propri dati — un socio a tutti gli effetti che non prenota online.
 */
export type AccountState = "none" | "invited" | "active";

export interface AccountInfo {
  state: AccountState;
  invitedAt?: number;
  lastSentAt?: number;
  sentCount?: number;
  acceptedAt?: number;
}

export interface Membership {
  id: string;
  startsAt: number;
  endsAt: number;
  paid: boolean;
  paidAt?: number;
  method?: "cash" | "pos";
  amount?: number;
  note?: string;
}

export interface Client {
  id: string;
  /** Assente finché la scheda non è collegata a un account. */
  clerkUserId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birthDate?: number;
  birthPlace?: string;
  gender?: Gender;
  avatarUrl?: string;
  level: number;
  code?: string;
  consents?: {
    marketing: boolean;
    newsletter: boolean;
    tracking: boolean;
    updatedAt: number;
  };
  createdAt: number;
  /** Saldo punti: zero per chi non ne ha mai ricevuti. */
  points: number;
  /** Fa parte dello staff: compare solo con il filtro «Mostra staff». */
  isStaff?: boolean;
  /** Account sospeso: non entra né dal sito né dall'app, punti congelati. */
  suspension?: { reason: string; suspendedAt: number };
  missingFields: string[];
  account: AccountInfo;
  membership: Membership | null;
  membershipState: MembershipState;
}

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

export interface ClientDetail extends Omit<Client, "membership"> {
  memberships: Membership[];
  taxCode?: string;
  residence?: Residence;
  health?: Health;
  /** Note interne dello staff: non escono mai verso il cliente. */
  clubNotes?: string;
  /**
   * L'eliminazione dell'account: in corso finché non c'è `deletedAt`, poi la
   * scheda è solo una copia fino a `purgeAt`.
   */
  deletion: ClientDeletion | null;
}

export interface ClientDeletion {
  requestedAt: number;
  requestedBy: "self" | "staff";
  effectiveAt: number;
  deletedAt?: number;
  purgeAt?: number;
}

/**
 * Le linguette della scheda cliente. Stanno qui e non nel componente perché
 * le legge anche la pagina server (`?tab=`), che da un modulo client
 * riceverebbe un riferimento e non l'elenco.
 */
export const CLIENT_TABS = [
  "profile",
  "account",
  "membership",
  "points",
] as const;
export type ClientTab = (typeof CLIENT_TABS)[number];
