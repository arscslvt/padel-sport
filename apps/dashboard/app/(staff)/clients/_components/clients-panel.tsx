"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AlertCircle, Loader2, Search, UserRoundX, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LevelBars } from "@/components/level-bars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { findLevelRangeIndex } from "@/lib/levels";
import { Input } from "../../../_components/input";
import { AccountBadge } from "./account-badge";
import { ClientSheet } from "./client-sheet";
import { ClientsSummary } from "./clients-summary";
import { CreateClientDialog } from "./create-client-dialog";
import {
  activeCount,
  type ClientFilters,
  DEFAULT_FILTERS,
  facetCounts,
  matchesAccount,
  matchesMembership,
} from "./filters";
import { FiltersToolbar } from "./filters-toolbar";
import { MembershipBadge } from "./membership-badge";
import {
  ActiveFilterChips,
  MobileFiltersButton,
  MobileFiltersDrawer,
} from "./mobile-filters";
import { PointsBadge } from "./points-badge";
import {
  type ClientSort,
  DEFAULT_SORT,
  type SortKey,
  sortClients,
} from "./sort-menu";
import type { Client } from "./types";

/**
 * L'elenco dei clienti.
 *
 * Legge da una route e non da Convex in diretta: qui ci sono telefoni, date di
 * nascita e consensi, e una query leggibile dal browser sarebbe leggibile da
 * chiunque conosca l'URL del deployment. Il prezzo è la reattività — l'elenco
 * si ricarica dopo ogni modifica invece di aggiornarsi da solo — che per
 * un'anagrafica è un prezzo basso.
 */

function ClientRow({
  client,
  sortKey,
  onOpen,
}: {
  client: Client;
  /** L'ordinamento attivo: da telefono la riga ne mostra il valore. */
  sortKey: SortKey;
  onOpen: (id: string) => void;
}) {
  const incomplete = client.missingFields.length > 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(client.id)}
        className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      >
        <Avatar className="size-10 shrink-0">
          {client.avatarUrl && <AvatarImage src={client.avatarUrl} />}
          <AvatarFallback>
            {client.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{client.name}</span>
            {client.isStaff && (
              <Badge variant="secondary" className="font-normal">
                Staff
              </Badge>
            )}
            {incomplete && (
              <Badge
                variant="outline"
                className="border-warning-border bg-warning-subtle text-warning-foreground font-normal"
              >
                <AlertCircle className="size-3.5" />
                Dati incompleti
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {client.email ?? "email non disponibile"}
            {client.phone ? ` · ${client.phone}` : ""}
          </p>
        </div>

        {(client.account.state !== "active" || client.suspension) && (
          <AccountBadge
            state={client.account.state}
            suspended={Boolean(client.suspension)}
            className="hidden shrink-0 md:inline-flex"
          />
        )}

        {client.points > 0 && (
          <PointsBadge
            points={client.points}
            frozen={Boolean(client.suspension)}
            className="hidden shrink-0 sm:inline-flex"
          />
        )}

        {/*
         * Da telefono i badge della riga non ci stanno: ordinando per punti o
         * per livello, in coda resta il valore su cui si sta ordinando — senza,
         * l'ordine si vedrebbe ma non si capirebbe.
         */}
        {sortKey === "points" && (
          <PointsBadge
            points={client.points}
            frozen={Boolean(client.suspension)}
            className="shrink-0 sm:hidden"
          />
        )}
        {sortKey === "level" && (
          <span className="flex shrink-0 items-center gap-1.5 text-[15px] font-semibold tabular-nums sm:hidden">
            {client.level.toFixed(1)}
            <LevelBars filled={findLevelRangeIndex(client.level) + 1} />
          </span>
        )}

        <MembershipBadge
          state={client.membershipState}
          until={
            client.membership
              ? format(client.membership.endsAt, "d MMM yy", { locale: it })
              : undefined
          }
          className="hidden shrink-0 sm:inline-flex"
        />
      </button>
    </li>
  );
}

/**
 * L'elenco com'era quando lo si è lasciato per la pagina di un cliente.
 *
 * Da telefono un cliente si apre a tutta pagina, non nel pannello laterale:
 * tornando indietro l'elenco ripartirebbe da zero — ricerca, filtri, ordine e
 * scorrimento persi, e la lista da ricaricare. Vive in memoria e non nel
 * browser: serve per il viaggio di andata e ritorno, non per la prossima
 * visita.
 */
interface ReturnSnapshot {
  clients: Client[] | null;
  query: string;
  filters: ClientFilters;
  sort: ClientSort;
  scrollY: number;
}

let returnSnapshot: ReturnSnapshot | null = null;

/** C'è un elenco a cui tornare: la pagina del cliente torna indietro. */
export function hasClientsReturn(): boolean {
  return returnSnapshot !== null;
}

export function ClientsPanel() {
  // Il ritorno dalla pagina di un cliente: si riparte da dove si era.
  const [restored] = useState(() => returnSnapshot);
  const [clients, setClients] = useState<Client[] | null>(
    () => restored?.clients ?? null,
  );
  /** L'ultimo elenco completo, senza ricerca: è quello che il riepilogo conta. */
  const [allClients, setAllClients] = useState<Client[] | null>(() =>
    restored && !restored.query ? restored.clients : null,
  );
  /** Una richiesta in volo: la ricerca passa dal server, e lo si deve vedere. */
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(() => restored?.query ?? "");
  const [filters, setFilters] = useState<ClientFilters>(
    () => restored?.filters ?? DEFAULT_FILTERS,
  );
  const [sort, setSort] = useState<ClientSort>(
    () => restored?.sort ?? DEFAULT_SORT,
  );
  const router = useRouter();
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  /**
   * `?client=` apre direttamente la scheda: è dove atterra chi tocca una
   * notifica che parla di quella persona. Si legge una volta sola — dopo,
   * comanda chi clicca nell'elenco.
   */
  const searchParams = useSearchParams();
  const [openClient, setOpenClient] = useState<string | null>(() =>
    searchParams.get("client"),
  );

  // Lo scorrimento torna dov'era appena l'elenco è di nuovo a video; poi lo
  // stato salvato non serve più.
  useEffect(() => {
    if (!restored) return;
    returnSnapshot = null;
    requestAnimationFrame(() => window.scrollTo(0, restored.scrollY));
  }, [restored]);

  // Da telefono il link di una notifica (`?client=`) va alla pagina intera,
  // come il tocco su una riga. Il controllo è diretto e non da `isMobile`,
  // che al primo disegno non è ancora noto.
  useEffect(() => {
    const target = searchParams.get("client");
    if (!target || !window.matchMedia("(max-width: 767px)").matches) return;
    setOpenClient(null);
    router.replace(`/clients/${target}`);
  }, [searchParams, router]);

  /**
   * Da desktop il pannello laterale tiene l'elenco accanto; da telefono il
   * pannello coprirebbe tutto comunque, e una pagina vera si naviga meglio —
   * indietro con il gesto di sistema, e l'elenco ritrovato com'era.
   */
  const openClientFromList = (id: string) => {
    if (!isMobile) {
      setOpenClient(id);
      return;
    }
    returnSnapshot = { clients, query, filters, sort, scrollY: window.scrollY };
    router.push(`/clients/${id}`);
  };

  // Lo staff arriva sempre, marcato con `isStaff`: «Mostra staff» filtra qui
  // come i filtri della tessera, senza tornare al server.
  const load = useCallback(async (search: string) => {
    const params = new URLSearchParams({ staff: "1" });
    if (search) params.set("q", search);

    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/clients?${params}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Clienti non caricati", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        setClients([]);
        return;
      }

      setClients(payload.clients ?? []);
      if (!search) setAllClients(payload.clients ?? []);
    } catch {
      toast.error("Clienti non caricati", {
        description: "Controlla la connessione e riprova.",
      });
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // La ricerca aspetta che si smetta di scrivere: ogni tasto è una chiamata.
  useEffect(() => {
    const timer = setTimeout(() => void load(query.trim()), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, load]);

  /** L'elenco su cui lavorano i filtri: lo staff c'è solo se richiesto. */
  const scoped = useMemo(() => {
    if (!clients) return [];
    return filters.showStaff
      ? clients
      : clients.filter((client) => !client.isStaff);
  }, [clients, filters.showStaff]);

  const visible = useMemo(
    () =>
      sortClients(
        scoped.filter(
          (client) =>
            matchesMembership(client, filters.membership) &&
            matchesAccount(client, filters.account),
        ),
        sort,
      ),
    [scoped, filters.membership, filters.account, sort],
  );

  /** Quanti ne dà ogni scelta: barra e drawer li mostrano prima del clic. */
  const filterCounts = useMemo(
    () => facetCounts(scoped, filters),
    [scoped, filters],
  );

  // Il riepilogo parla dell'anagrafica intera, non della ricerca in corso:
  // cercando «Mario» non deve dire «1 cliente». Lo staff resta fuori.
  const summarySource = useMemo(
    () => (allClients ?? []).filter((client) => !client.isStaff),
    [allClients],
  );

  return (
    <>
      {allClients === null ? (
        // La forma del riepilogo mentre arriva: un «0 clienti» di passaggio
        // direbbe una cosa falsa.
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-2.5 w-full rounded-full" />
          <Skeleton className="h-5 w-64" />
        </div>
      ) : (
        <ClientsSummary
          clients={summarySource}
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}

      {/*
       * Da telefono la barra è una riga sola — ricerca, filtri, nuovo
       * cliente — e i filtri vivono nel drawer. Da 768px in su tornano in
       * fila sotto la ricerca, dove c'è spazio per vederli tutti.
       */}
      <div
        data-tour="clients-search"
        className="mt-6 flex items-center gap-2 md:gap-3"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Cerca per nome, cognome, email o telefono…"
            className="h-10 bg-white pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {loading && clients !== null && (
            <Loader2
              aria-label="Ricerca in corso"
              className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin"
            />
          )}
        </div>
        <div className="md:hidden">
          <MobileFiltersButton
            activeCount={activeCount(filters, sort)}
            onClick={() => setFiltersOpen(true)}
          />
        </div>
        <CreateClientDialog onCreated={() => void load(query.trim())} />
      </div>

      <div className="md:hidden">
        <ActiveFilterChips
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
        />
      </div>

      <MobileFiltersDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onFiltersChange={setFilters}
        sort={sort}
        onSortChange={setSort}
        counts={filterCounts}
        resultCount={visible.length}
      />

      <div className="hidden md:block">
        <FiltersToolbar
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          counts={filterCounts}
          resultCount={visible.length}
          totalCount={scoped.length}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border">
        {clients === null ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : visible.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {query ? (
                  <UserRoundX className="size-5" />
                ) : (
                  <Users className="size-5" />
                )}
              </EmptyMedia>
              <EmptyTitle>
                {query ? "Nessun cliente trovato" : "Nessun cliente"}
              </EmptyTitle>
              <EmptyDescription>
                {query
                  ? "Prova con un'altra parte del nome, o con l'email."
                  : "Invita la prima persona: riceverà il link per iscriversi da sé."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y bg-white">
            {visible.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                sortKey={sort.key}
                onOpen={openClientFromList}
              />
            ))}
          </ul>
        )}
      </div>

      <ClientSheet
        playerId={openClient}
        preview={clients?.find((client) => client.id === openClient)}
        open={openClient !== null}
        onOpenChange={(open) => !open && setOpenClient(null)}
        onSaved={() => void load(query.trim())}
      />
    </>
  );
}
