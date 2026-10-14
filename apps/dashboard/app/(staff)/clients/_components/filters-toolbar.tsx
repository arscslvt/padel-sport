"use client";

import { ChevronDown, UserPen, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import {
  ACCOUNT_FILTERS,
  type AccountFilter,
  accountLabel,
  type ClientFilters,
  DEFAULT_FILTERS,
  type FacetCounts,
  INCOMPLETE_LABEL,
  MEMBERSHIP_FILTERS,
  URGENT_MEMBERSHIP,
} from "./filters";
import { type ClientSort, DEFAULT_SORT, SortMenu } from "./sort-menu";

/**
 * Filtri e ordinamento da desktop.
 *
 * La tessera è la domanda di tutti i giorni, e sta in vista: un controllo a
 * segmenti con il conteggio dentro ogni voce, così si legge «3 da pagare»
 * prima ancora di cliccare. «Dati da completare» è un sì o no, e sta in un
 * interruttore accanto. Account, staff e ordinamento sono domande
 * occasionali e stanno in due menu compatti a destra. Sotto, una riga dice
 * quanti se ne vedono e riporta tutto com'era con un clic.
 */

export function FiltersToolbar({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  counts,
  resultCount,
  totalCount,
}: {
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
  sort: ClientSort;
  onSortChange: (sort: ClientSort) => void;
  counts: FacetCounts;
  resultCount: number;
  /** Tutti quelli in elenco, staff compreso solo se incluso. */
  totalCount: number;
}) {
  const filtered =
    filters.membership !== DEFAULT_FILTERS.membership ||
    filters.account !== DEFAULT_FILTERS.account ||
    filters.incomplete !== DEFAULT_FILTERS.incomplete;
  const changed =
    filtered ||
    filters.showStaff !== DEFAULT_FILTERS.showStaff ||
    sort.key !== DEFAULT_SORT.key;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        {/* Scorre di lato invece di andare a capo, fra 768 e 1024px. */}
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <fieldset className="bg-muted inline-flex rounded-lg p-1">
            <legend className="sr-only">Tessera</legend>
            {MEMBERSHIP_FILTERS.map((option) => {
              const selected = filters.membership === option.value;
              const count = counts.membership[option.value];
              const urgent = URGENT_MEMBERSHIP.has(option.value) && count > 0;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onFiltersChange({ ...filters, membership: option.value })
                  }
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm whitespace-nowrap transition-colors",
                    selected
                      ? "bg-background text-foreground font-medium shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      urgent
                        ? "font-medium text-danger"
                        : "text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </fieldset>
        </div>

        {/* Un interruttore, non un menu: la domanda è sì o no. */}
        <Button
          variant="outline"
          aria-pressed={filters.incomplete}
          title={INCOMPLETE_LABEL}
          onClick={() =>
            onFiltersChange({ ...filters, incomplete: !filters.incomplete })
          }
          className={cn(
            "h-10 shrink-0 bg-card",
            filters.incomplete && "border-foreground/25 bg-muted",
          )}
        >
          <UserPen className="size-4" />
          {/*
           * Con la barra laterale aperta lo spazio è poco fino a 1280px: lì va
           * ai segmenti delle tessere, e qui restano icona e numero.
           */}
          <span className="sr-only xl:not-sr-only">{INCOMPLETE_LABEL}</span>
          <span className="text-muted-foreground text-xs font-normal tabular-nums">
            {counts.incomplete}
          </span>
        </Button>
        <AccountMenu
          filters={filters}
          onFiltersChange={onFiltersChange}
          counts={counts}
        />
        <SortMenu value={sort} onChange={onSortChange} />
      </div>

      {/*
       * Solo quando aggiunge qualcosa: senza filtri il totale è già nel
       * segmento «Tutti», e ripeterlo qui sotto sarebbe rumore.
       */}
      {changed && (
        <div className="text-muted-foreground flex h-6 items-center gap-3 text-xs">
          {filtered && (
            <span className="tabular-nums">
              {resultCount} di {totalCount} clienti
            </span>
          )}
          <button
            type="button"
            className="hover:text-foreground underline underline-offset-4 transition-colors"
            onClick={() => {
              onFiltersChange(DEFAULT_FILTERS);
              onSortChange(DEFAULT_SORT);
            }}
          >
            Azzera filtri
          </button>
        </div>
      )}
    </div>
  );
}

/** Account e staff: chi è nell'elenco, più che in che stato è. */
function AccountMenu({
  filters,
  onFiltersChange,
  counts,
}: {
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
  counts: FacetCounts;
}) {
  const active = filters.account !== "all";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 shrink-0 bg-card",
            (active || filters.showStaff) && "border-foreground/25",
          )}
        >
          <Users className="size-4" />
          {active ? accountLabel(filters.account) : "Account"}
          {filters.showStaff && (
            <span className="text-muted-foreground font-normal">+ staff</span>
          )}
          <ChevronDown className="text-muted-foreground size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filters.account}
          onValueChange={(account) =>
            onFiltersChange({ ...filters, account: account as AccountFilter })
          }
        >
          {ACCOUNT_FILTERS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
              <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                {counts.account[option.value]}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={filters.showStaff}
          onCheckedChange={(showStaff) =>
            onFiltersChange({ ...filters, showStaff: Boolean(showStaff) })
          }
          // Restare aperto: è un interruttore, si vuole vedere che ha preso.
          onSelect={(event) => event.preventDefault()}
        >
          Includi lo staff
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
