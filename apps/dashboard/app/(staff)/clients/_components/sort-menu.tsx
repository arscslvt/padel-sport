"use client";

import { ArrowDownUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Client } from "./types";

/**
 * L'ordine dell'elenco.
 *
 * «Da sistemare» è quello che arriva dal server — prima le tessere da pagare o
 * scadute, poi per nome — e resta il punto di partenza: è la domanda che lo
 * staff si fa aprendo la pagina. Gli altri rispondono a domande occasionali,
 * ognuno con il verso che serve più spesso (i nuovi in cima, i punti dal più
 * alto) e la possibilità di rovesciarlo.
 */

export type SortKey = "attention" | "name" | "createdAt" | "level" | "points";
export type SortDirection = "asc" | "desc";

export interface ClientSort {
  key: SortKey;
  direction: SortDirection;
}

export const DEFAULT_SORT: ClientSort = { key: "attention", direction: "asc" };

const byName = (a: Client, b: Client) =>
  a.name.localeCompare(b.name, "it", { sensitivity: "base" });

export const SORTS: Record<
  SortKey,
  {
    label: string;
    natural: SortDirection;
    directions?: Record<SortDirection, string>;
    /** Confronto in ordine crescente; il verso lo applica `sortClients`. */
    compare?: (a: Client, b: Client) => number;
  }
> = {
  attention: { label: "Da sistemare", natural: "asc" },
  name: {
    label: "Nome",
    natural: "asc",
    directions: { asc: "A → Z", desc: "Z → A" },
    compare: byName,
  },
  createdAt: {
    label: "Aggiunta",
    natural: "desc",
    directions: { desc: "Più recenti", asc: "Meno recenti" },
    compare: (a, b) => a.createdAt - b.createdAt,
  },
  level: {
    label: "Livello",
    natural: "desc",
    directions: { desc: "Più alto", asc: "Più basso" },
    compare: (a, b) => a.level - b.level,
  },
  points: {
    label: "Punti",
    natural: "desc",
    directions: { desc: "Più punti", asc: "Meno punti" },
    compare: (a, b) => a.points - b.points,
  },
};

export const SORT_KEYS = Object.keys(SORTS) as SortKey[];

/** Il verso opposto a quello proposto: le due voci del secondo gruppo. */
export function sortDirections(key: SortKey): SortDirection[] {
  const { natural } = SORTS[key];
  return [natural, natural === "asc" ? "desc" : "asc"];
}

/** «Punti: Più punti», o solo «Da sistemare» quando il verso non conta. */
export function sortSummary(sort: ClientSort): string {
  const { label, directions } = SORTS[sort.key];
  return directions ? `${label}: ${directions[sort.direction]}` : label;
}

/** Ordina senza toccare l'array di partenza. A parità, decide il nome. */
export function sortClients(list: Client[], sort: ClientSort): Client[] {
  const { compare } = SORTS[sort.key];
  if (!compare) return list;

  const sign = sort.direction === "asc" ? 1 : -1;
  return [...list].sort((a, b) => sign * compare(a, b) || byName(a, b));
}

export function SortMenu({
  value,
  onChange,
}: {
  value: ClientSort;
  onChange: (sort: ClientSort) => void;
}) {
  const current = SORTS[value.key];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 bg-card">
          <ArrowDownUp className="size-4" />
          {sortSummary(value)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Ordina per</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value.key}
          onValueChange={(key) =>
            onChange({
              key: key as SortKey,
              direction: SORTS[key as SortKey].natural,
            })
          }
        >
          {SORT_KEYS.map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {SORTS[key].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {current.directions && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={value.direction}
              onValueChange={(direction) =>
                onChange({ ...value, direction: direction as SortDirection })
              }
            >
              {sortDirections(value.key).map((direction) => (
                <DropdownMenuRadioItem key={direction} value={direction}>
                  {current.directions?.[direction]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
