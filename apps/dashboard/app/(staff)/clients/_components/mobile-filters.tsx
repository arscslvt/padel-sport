"use client";

import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  ACCOUNT_FILTERS,
  accountLabel,
  type ClientFilters,
  DEFAULT_FILTERS,
  type FacetCounts,
  INCOMPLETE_LABEL,
  MEMBERSHIP_FILTERS,
  membershipLabel,
} from "./filters";
import {
  type ClientSort,
  DEFAULT_SORT,
  SORT_KEYS,
  SORTS,
  sortDirections,
  sortSummary,
} from "./sort-menu";

/**
 * Filtri e ordinamento da telefono.
 *
 * Su uno schermo stretto la barra del desktop andrebbe a capo tre volte e
 * spingerebbe l'elenco sotto la piega. Qui diventa un solo pulsante, con il
 * numero di scelte attive, e un drawer dal basso dove ogni scelta è un
 * riquadro grande quanto un pollice. Il modello è lo stesso (filters.ts).
 *
 * Quello che è attivo resta visibile anche a drawer chiuso, come chip da
 * togliere con un tocco: un filtro nascosto è un elenco che sembra incompleto.
 */

/** Nel drawer «Tutti» c'è già nel gruppo Tessera: qui bastano le due scelte. */
const ACCOUNT_GROUP = ACCOUNT_FILTERS.filter(
  (option) => option.value !== "all",
);

/** Un riquadro scelto/non scelto: la stessa forma per filtri e ordinamento. */
function Tile({
  selected,
  onSelect,
  label,
  count,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  count?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-[background-color,transform] active:scale-[0.98]",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-muted/60",
        className,
      )}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            selected ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-medium">{title}</h3>
      {children}
    </section>
  );
}

/** Il pulsante della barra: icona, e il numero di scelte diverse dal solito. */
export function MobileFiltersButton({
  activeCount,
  onClick,
}: {
  activeCount: number;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="relative size-10 shrink-0 bg-white"
      aria-label={
        activeCount > 0
          ? `Filtra e ordina, ${activeCount} attivi`
          : "Filtra e ordina"
      }
      onClick={onClick}
    >
      <SlidersHorizontal className="size-4" />
      {activeCount > 0 && (
        <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full text-[11px] font-medium tabular-nums">
          {activeCount}
        </span>
      )}
    </Button>
  );
}

/** Le scelte attive come chip: si tolgono senza riaprire il drawer. */
export function ActiveFilterChips({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
}: {
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
  sort: ClientSort;
  onSortChange: (sort: ClientSort) => void;
}) {
  const chips = [
    filters.membership !== "all" && {
      label: membershipLabel(filters.membership),
      clear: () => onFiltersChange({ ...filters, membership: "all" }),
    },
    filters.account !== "all" && {
      label: accountLabel(filters.account),
      clear: () => onFiltersChange({ ...filters, account: "all" }),
    },
    filters.incomplete && {
      label: INCOMPLETE_LABEL,
      clear: () => onFiltersChange({ ...filters, incomplete: false }),
    },
    filters.showStaff && {
      label: "Staff incluso",
      clear: () => onFiltersChange({ ...filters, showStaff: false }),
    },
    sort.key !== DEFAULT_SORT.key && {
      label: sortSummary(sort),
      clear: () => onSortChange(DEFAULT_SORT),
    },
  ].filter((chip): chip is { label: string; clear: () => void } =>
    Boolean(chip),
  );

  if (chips.length === 0) return null;

  return (
    // Scorre di lato invece di andare a capo: una riga sola, sempre.
    <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={chip.clear}
          aria-label={`Togli: ${chip.label}`}
          className="bg-primary/10 text-foreground flex h-8 shrink-0 items-center gap-1.5 rounded-full pr-2 pl-3 text-xs font-medium transition-transform active:scale-[0.97]"
        >
          {chip.label}
          <X className="text-muted-foreground size-3.5" />
        </button>
      ))}
    </div>
  );
}

export function MobileFiltersDrawer({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  counts,
  resultCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
  sort: ClientSort;
  onSortChange: (sort: ClientSort) => void;
  /** Quanti clienti dà ogni scelta, con le altre ferme (filters.ts). */
  counts: FacetCounts;
  resultCount: number;
}) {
  const pristine =
    filters.membership === DEFAULT_FILTERS.membership &&
    filters.account === DEFAULT_FILTERS.account &&
    filters.incomplete === DEFAULT_FILTERS.incomplete &&
    filters.showStaff === DEFAULT_FILTERS.showStaff &&
    sort.key === DEFAULT_SORT.key;
  const current = SORTS[sort.key];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background">
        <DrawerHeader className="text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <DrawerTitle>Filtra e ordina</DrawerTitle>
          <DrawerDescription className="sr-only">
            Scegli quali clienti vedere e in che ordine.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-2">
          <Group title="Tessera">
            <div className="grid grid-cols-2 gap-2">
              {MEMBERSHIP_FILTERS.map((option) => (
                <Tile
                  key={option.value}
                  label={option.label}
                  count={counts.membership[option.value]}
                  selected={filters.membership === option.value}
                  onSelect={() =>
                    onFiltersChange({ ...filters, membership: option.value })
                  }
                />
              ))}
            </div>
          </Group>

          <Group title="Account">
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_GROUP.map((option) => (
                <Tile
                  key={option.value}
                  label={option.label}
                  count={counts.account[option.value]}
                  selected={filters.account === option.value}
                  // Si combina con la tessera. Ritoccare la scelta attiva la
                  // toglie: qui non c'è un «Tutti» come nel gruppo sopra.
                  onSelect={() =>
                    onFiltersChange({
                      ...filters,
                      account:
                        filters.account === option.value ? "all" : option.value,
                    })
                  }
                />
              ))}
            </div>
          </Group>

          <Group title="Anagrafica">
            <div className="grid grid-cols-2 gap-2">
              <Tile
                label={INCOMPLETE_LABEL}
                count={counts.incomplete}
                selected={filters.incomplete}
                onSelect={() =>
                  onFiltersChange({
                    ...filters,
                    incomplete: !filters.incomplete,
                  })
                }
                className="col-span-2"
              />
            </div>
          </Group>

          <Group title="Ordina per">
            <div className="grid grid-cols-2 gap-2">
              {SORT_KEYS.map((key) => (
                <Tile
                  key={key}
                  label={SORTS[key].label}
                  selected={sort.key === key}
                  onSelect={() =>
                    onSortChange({ key, direction: SORTS[key].natural })
                  }
                  className={key === "attention" ? "col-span-2" : undefined}
                />
              ))}
            </div>

            {current.directions && (
              <fieldset className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
                <legend className="sr-only">Verso</legend>
                {sortDirections(sort.key).map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    aria-pressed={sort.direction === direction}
                    onClick={() => onSortChange({ ...sort, direction })}
                    className={cn(
                      "min-h-9 rounded-md text-sm transition-colors",
                      sort.direction === direction
                        ? "bg-background font-medium shadow-xs"
                        : "text-muted-foreground",
                    )}
                  >
                    {current.directions?.[direction]}
                  </button>
                ))}
              </fieldset>
            )}
          </Group>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="mobile-show-staff">Mostra lo staff</Label>
              <p className="text-muted-foreground text-xs">
                Per gestire punti e tessera di chi lavora al club.
              </p>
            </div>
            <Switch
              id="mobile-show-staff"
              checked={filters.showStaff}
              onCheckedChange={(showStaff) =>
                onFiltersChange({ ...filters, showStaff })
              }
            />
          </div>
        </div>

        <DrawerFooter className="flex-row gap-2 border-t pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            variant="ghost"
            disabled={pristine}
            onClick={() => {
              onFiltersChange(DEFAULT_FILTERS);
              onSortChange(DEFAULT_SORT);
            }}
          >
            Azzera
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            {resultCount === 1
              ? "Mostra 1 cliente"
              : `Mostra ${resultCount} clienti`}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
