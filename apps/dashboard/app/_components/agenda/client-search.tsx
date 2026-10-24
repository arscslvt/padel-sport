"use client";

import { format } from "date-fns";
import { Cake, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LevelBars } from "@/components/level-bars";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEVEL_BARS, LEVEL_LABELS, levelFromRating } from "./lib";

/**
 * Cercare un cliente in anagrafica mentre si scrive un nome: per chi prenota
 * e per i compagni, in una prenotazione nuova come nella modifica dei
 * giocatori.
 *
 * Un nome collegato a un cliente fa contare la partita anche per lui nei punti
 * automatici (packages/backend/convex/modules/points/auto.ts). Se il cliente
 * non c'è, il nome resta libero come sempre.
 *
 * Lo staff vede tutta l'anagrafica: il consenso a farsi trovare che i clienti
 * danno dall'area personale vale per gli altri clienti, non per il club.
 */

export interface ClientOption {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  /** A mezzogiorno del giorno di nascita: lo distingue dagli omonimi. */
  birthDate?: number;
  level: number;
}

/** Il nome collegato a un cliente. `fixed`: chi ha prenotato, o chi è entrato dall'app. */
export interface PlayerLink {
  name: string;
  playerId: string;
  fixed?: boolean;
}

const SUGGESTIONS = 5;

/**
 * L'anagrafica, chiesta una volta all'apertura: sono poche centinaia di
 * righe e si filtra qui.
 */
export function useClients(): ClientOption[] {
  const [clients, setClients] = useState<ClientOption[]>([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/dashboard/clients")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (alive) setClients(payload?.clients ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return clients;
}

/** I clienti che somigliano a quel che si sta scrivendo, per nome o telefono. */
export function useClientMatches(
  clients: ClientOption[],
  query: string,
  /** Già scelti in un altro posto: non si propongono due volte. */
  exclude: readonly string[] = [],
): ClientOption[] {
  return useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    const digits = needle.replace(/\s/g, "");
    return clients
      .filter((row) => !exclude.includes(row.id))
      .filter(
        (row) =>
          row.name.toLowerCase().includes(needle) ||
          row.phone?.replace(/\s/g, "").includes(digits),
      )
      .slice(0, SUGGESTIONS);
  }, [clients, query, exclude]);
}

/**
 * Il livello del cliente in tacche, accanto al nome: si legge al volo, senza
 * parole. L'etichetta resta per chi usa lo screen reader.
 */
function ClientLevel({ rating }: { rating?: number }) {
  if (rating === undefined) return null;
  const level = levelFromRating(rating);
  return (
    <>
      <LevelBars filled={LEVEL_BARS[level]} />
      <span className="sr-only">, livello {LEVEL_LABELS[level]}</span>
    </>
  );
}

/**
 * Una proposta dell'elenco: il nome con il livello, sotto la data di nascita
 * se c'è, a destra il telefono. Due «Giuseppe Prova» si distinguono così
 * senza aprire la scheda.
 */
export function ClientOptionLabel({ option }: { option: ClientOption }) {
  return (
    <>
      <span className="min-w-0 flex-1 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[15px]">{option.name}</span>
          <ClientLevel rating={option.level} />
        </span>
        {option.birthDate !== undefined && (
          <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
            <Cake aria-hidden className="size-3.5" />
            <span className="sr-only">Nato il</span>
            {format(option.birthDate, "dd/MM/yyyy")}
          </span>
        )}
      </span>
      <span className="text-muted-foreground shrink-0 text-xs">
        {option.phone ?? "Cliente"}
      </span>
    </>
  );
}

export function ClientSuggestions({
  options,
  onPick,
  className,
}: {
  options: ClientOption[];
  onPick: (option: ClientOption) => void;
  className?: string;
}) {
  if (options.length === 0) return null;

  return (
    <ul
      className={cn(
        "bg-card overflow-hidden rounded-xl border [&>*+*]:border-t",
        className,
      )}
    >
      {options.map((option) => (
        <li key={option.id}>
          <button
            type="button"
            // Prima del blur del campo: altrimenti il tocco chiude l'elenco
            // prima di arrivare al pulsante.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(option)}
            className="active:bg-muted/80 md:hover:bg-muted/50 flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left"
          >
            <ClientOptionLabel option={option} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Il nome collegato: si vede chi è, e si scollega con la X. */
export function LinkedClient({
  name,
  level,
  onUnlink,
  touch,
}: {
  name: string;
  /** Il livello del cliente (1–5), se si conosce: diventa le tacche. */
  level?: number;
  /** Assente: il collegamento non si toglie da qui. */
  onUnlink?: () => void;
  touch?: boolean;
}) {
  return (
    <div
      className={cn(
        // Due righe, nome e «Cliente in anagrafica»: il padding le tiene
        // lontane dal bordo anche dove la riga è più bassa (da desktop).
        "bg-muted/50 flex items-center gap-3 rounded-xl border px-3 py-2",
        touch ? "min-h-12" : "min-h-11",
      )}
    >
      <UserRound className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[15px] font-medium md:text-sm">
            {name}
          </span>
          <ClientLevel rating={level} />
        </span>
        <span className="text-muted-foreground block text-xs">
          Cliente in anagrafica
        </span>
      </span>
      {onUnlink && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-full"
          aria-label={`Scollega ${name}`}
          onClick={onUnlink}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
