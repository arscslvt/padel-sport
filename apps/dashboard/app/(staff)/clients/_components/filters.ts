import { type ClientSort, DEFAULT_SORT } from "./sort-menu";
import type { Client } from "./types";

/**
 * I filtri dell'elenco clienti, gli stessi da telefono e da desktop.
 *
 * Sono tre domande diverse e si combinano: *a che punto è la tessera*, *ha un
 * modo di prenotare online* e *gli manca qualcosa in anagrafica*. Tenerle
 * separate permette di chiedere «tessere scadute di chi non ha l'account» —
 * la persona da chiamare al telefono, perché una mail non la leggerebbe — o
 * «senza account e con dati da completare», invece di scegliere l'una o
 * l'altra.
 *
 * Lo staff non è un filtro ma un'inclusione: di norma è fuori, e si fa entrare
 * per gestire chi lavora al club ed è anche socio.
 */

export const MEMBERSHIP_FILTERS = [
  { value: "all", label: "Tutti" },
  { value: "unpaid", label: "Da pagare" },
  { value: "expired", label: "Scadute" },
  { value: "expiring", label: "In scadenza" },
  { value: "none", label: "Senza tessera" },
  { value: "active", label: "In regola" },
] as const;

export const ACCOUNT_FILTERS = [
  { value: "all", label: "Tutti gli account" },
  { value: "no-account", label: "Senza account" },
  { value: "invited", label: "Invitati" },
] as const;

export type MembershipFilter = (typeof MEMBERSHIP_FILTERS)[number]["value"];
export type AccountFilter = (typeof ACCOUNT_FILTERS)[number]["value"];

export interface ClientFilters {
  membership: MembershipFilter;
  account: AccountFilter;
  /** Solo chi ha dati mancanti in anagrafica (`missingFields`). */
  incomplete: boolean;
  showStaff: boolean;
}

export const DEFAULT_FILTERS: ClientFilters = {
  membership: "all",
  account: "all",
  incomplete: false,
  showStaff: false,
};

export const INCOMPLETE_LABEL = "Dati da completare";

/** I filtri che meritano un colore: c'è qualcosa da incassare o rinnovare. */
export const URGENT_MEMBERSHIP = new Set<MembershipFilter>([
  "unpaid",
  "expired",
]);

export function matchesMembership(
  client: Client,
  filter: MembershipFilter,
): boolean {
  return filter === "all" || client.membershipState === filter;
}

export function matchesAccount(client: Client, filter: AccountFilter): boolean {
  if (filter === "all") return true;
  return (
    client.account.state === (filter === "no-account" ? "none" : "invited")
  );
}

export function matchesIncomplete(client: Client, only: boolean): boolean {
  return !only || client.missingFields.length > 0;
}

/** Tutti i filtri insieme: è la domanda che fa l'elenco. */
export function matchesFilters(client: Client, filters: ClientFilters) {
  return (
    matchesMembership(client, filters.membership) &&
    matchesAccount(client, filters.account) &&
    matchesIncomplete(client, filters.incomplete)
  );
}

export function membershipLabel(filter: MembershipFilter): string {
  return (
    MEMBERSHIP_FILTERS.find((option) => option.value === filter)?.label ?? ""
  );
}

export function accountLabel(filter: AccountFilter): string {
  return ACCOUNT_FILTERS.find((option) => option.value === filter)?.label ?? "";
}

/**
 * Quanti clienti dà ogni scelta, tenendo ferme le altre dimensioni: con
 * «Senza account» attivo, «Scadute 3» vuol dire tre scadute senza account.
 * È il numero che si ottiene toccandola, non un totale da interpretare.
 */
export function facetCounts(scoped: Client[], filters: ClientFilters) {
  const membership = Object.fromEntries(
    MEMBERSHIP_FILTERS.map((option) => [
      option.value,
      scoped.filter((client) =>
        matchesFilters(client, { ...filters, membership: option.value }),
      ).length,
    ]),
  ) as Record<MembershipFilter, number>;

  const account = Object.fromEntries(
    ACCOUNT_FILTERS.map((option) => [
      option.value,
      scoped.filter((client) =>
        matchesFilters(client, { ...filters, account: option.value }),
      ).length,
    ]),
  ) as Record<AccountFilter, number>;

  const incomplete = scoped.filter((client) =>
    matchesFilters(client, { ...filters, incomplete: true }),
  ).length;

  return { membership, account, incomplete };
}

export type FacetCounts = ReturnType<typeof facetCounts>;

/** Quante scelte sono diverse da quelle di partenza, ordinamento compreso. */
export function activeCount(filters: ClientFilters, sort: ClientSort): number {
  return (
    Number(filters.membership !== DEFAULT_FILTERS.membership) +
    Number(filters.account !== DEFAULT_FILTERS.account) +
    Number(filters.incomplete !== DEFAULT_FILTERS.incomplete) +
    Number(filters.showStaff !== DEFAULT_FILTERS.showStaff) +
    Number(sort.key !== DEFAULT_SORT.key)
  );
}
