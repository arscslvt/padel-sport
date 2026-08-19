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
}
