"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AlertCircle, Search, UserRoundX, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/(dashboard)/_components/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Input } from "../../../_components/input";
import { AccountBadge } from "./account-badge";
import { ClientSheet } from "./client-sheet";
import { CreateClientDialog } from "./create-client-dialog";
import {
  MEMBERSHIP_FILTERS,
  MembershipBadge,
  type MembershipFilter,
} from "./membership-badge";
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
  onOpen,
}: {
  client: Client;
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
            {incomplete && (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 font-normal text-amber-900"
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

        {client.account.state !== "active" && (
          <AccountBadge
            state={client.account.state}
            className="hidden shrink-0 md:inline-flex"
          />
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

export function ClientsPanel() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MembershipFilter>("all");
  /**
   * `?client=` apre direttamente la scheda: è dove atterra chi tocca una
   * notifica che parla di quella persona. Si legge una volta sola — dopo,
   * comanda chi clicca nell'elenco.
   */
  const searchParams = useSearchParams();
  const [openClient, setOpenClient] = useState<string | null>(() =>
    searchParams.get("client"),
  );

  const load = useCallback(async (search: string) => {
    try {
      const response = await fetch(
        `/api/dashboard/clients${search ? `?q=${encodeURIComponent(search)}` : ""}`,
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Clienti non caricati", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        setClients([]);
        return;
      }

      setClients(payload.clients ?? []);
    } catch {
      toast.error("Clienti non caricati", {
        description: "Controlla la connessione e riprova.",
      });
      setClients([]);
    }
  }, []);

  // La ricerca aspetta che si smetta di scrivere: ogni tasto è una chiamata.
  useEffect(() => {
    const timer = setTimeout(() => void load(query.trim()), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, load]);

  const visible = useMemo(() => {
    if (!clients) return [];
    if (filter === "all") return clients;
    if (filter === "no-account" || filter === "invited") {
      const state = filter === "no-account" ? "none" : "invited";
      return clients.filter((client) => client.account.state === state);
    }
    return clients.filter((client) => client.membershipState === filter);
  }, [clients, filter]);

  const counts = useMemo(() => {
    const list = clients ?? [];
    return {
      total: list.length,
      toFix: list.filter((client) =>
        ["unpaid", "expired", "none"].includes(client.membershipState),
      ).length,
      incomplete: list.filter((client) => client.missingFields.length > 0)
        .length,
      noAccount: list.filter((client) => client.account.state === "none")
        .length,
    };
  }, [clients]);

  return (
    <>
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Clienti</CardDescription>
            <CardTitle className="text-3xl">{counts.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Profili registrati, staff escluso.
          </CardContent>
        </Card>

        <Card
          className={cn(counts.toFix > 0 && "border-amber-300 bg-amber-50")}
        >
          <CardHeader>
            <CardDescription
              className={cn(counts.toFix > 0 && "font-medium text-amber-600")}
            >
              Tessere da sistemare
            </CardDescription>
            <CardTitle className="text-3xl">{counts.toFix}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Scadute, mai aperte o ancora da pagare.
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardDescription>Senza account</CardDescription>
            <CardTitle className="text-3xl">{counts.noAccount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Soci registrati che non prenotano online: {counts.incomplete} hanno
            anche dei dati da completare.
          </CardContent>
        </Card>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Cerca per nome, cognome, email o telefono…"
            className="h-10 bg-white pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <CreateClientDialog onCreated={() => void load(query.trim())} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {MEMBERSHIP_FILTERS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={filter === option.value ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
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
                onOpen={setOpenClient}
              />
            ))}
          </ul>
        )}
      </div>

      <ClientSheet
        playerId={openClient}
        open={openClient !== null}
        onOpenChange={(open) => !open && setOpenClient(null)}
        onSaved={() => void load(query.trim())}
      />
    </>
  );
}
