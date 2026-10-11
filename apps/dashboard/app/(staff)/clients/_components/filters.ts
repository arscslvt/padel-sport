import { type ClientSort, DEFAULT_SORT } from "./sort-menu";
import type { Client } from "./types";

/**
 * I filtri dell'elenco clienti, gli stessi da telefono e da desktop.
 *
 * Sono due domande diverse e si combinano: *a che punto è la tessera* e *ha un
 * modo di prenotare online*. Tenerle separate permette di chiedere «tessere
 * scadute di chi non ha l'account» — la persona da chiamare al telefono,
 * perché una mail non la leggerebbe — invece di scegliere l'una o l'altra.
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
  showStaff: boolean;
}

export const DEFAULT_FILTERS: ClientFilters = {
  membership: "all",
  account: "all",
  showStaff: false,
};

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

export function membershipLabel(filter: MembershipFilter): string {
  return (
    MEMBERSHIP_FILTERS.find((option) => option.value === filter)?.label ?? ""
  );
}

export function accountLabel(filter: AccountFilter): string {
  return ACCOUNT_FILTERS.find((option) => option.value === filter)?.label ?? "";
}

/**
 * Quanti clienti dà ogni scelta, tenendo ferma l'altra dimensione: con
 * «Senza account» attivo, «Scadute 3» vuol dire tre scadute senza account.
 * È il numero che si ottiene toccandola, non un totale da interpretare.
 */
export function facetCounts(scoped: Client[], filters: ClientFilters) {
  const membership = Object.fromEntries(
    MEMBERSHIP_FILTERS.map((option) => [
      option.value,
      scoped.filter(
        (client) =>
          matchesAccount(client, filters.account) &&
          matchesMembership(client, option.value),
      ).length,
    ]),
  ) as Record<MembershipFilter, number>;

  const account = Object.fromEntries(
    ACCOUNT_FILTERS.map((option) => [
      option.value,
      scoped.filter(
        (client) =>
          matchesMembership(client, filters.membership) &&
          matchesAccount(client, option.value),
      ).length,
    ]),
  ) as Record<AccountFilter, number>;

  return { membership, account };
}

export type FacetCounts = ReturnType<typeof facetCounts>;

/** Quante scelte sono diverse da quelle di partenza, ordinamento compreso. */
export function activeCount(filters: ClientFilters, sort: ClientSort): number {
  return (
    Number(filters.membership !== DEFAULT_FILTERS.membership) +
    Number(filters.account !== DEFAULT_FILTERS.account) +
    Number(filters.showStaff !== DEFAULT_FILTERS.showStaff) +
    Number(sort.key !== DEFAULT_SORT.key)
  );
}
