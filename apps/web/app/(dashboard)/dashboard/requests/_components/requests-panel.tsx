"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Inbox, LifeBuoy, MailCheck, Users } from "lucide-react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/(dashboard)/_components/tabs";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { levelLabel, missingPlayersLabel } from "@/lib/match-request";
import { cn } from "@/lib/utils";

import { RequestSheet, type Selection } from "./request-sheet";
import { MatchStatusBadge, SupportStatusBadge } from "./status-badge";
import {
  isOpenMatch,
  isOpenSupport,
  type MatchRequest,
  type SupportRequest,
} from "./types";

/**
 * Le richieste che arrivano dai moduli del sito, in un posto solo.
 *
 * Prima esistevano solo come mail e come avviso sul telefono: chi le riceveva
 * non aveva una pagina dove tornare, e «l'ho già chiamato?» era una domanda
 * senza risposta. Lo stato che le tabelle modellavano da sempre — presa in
 * carico, risolta, archiviata — comincia qui a servire a qualcosa.
 */

function formatWhen(timestamp: number) {
  return format(timestamp, "d MMM yyyy, HH:mm", { locale: it });
}

function RequestRow({
  onOpen,
  active,
  title,
  subtitle,
  meta,
  badge,
}: {
  onOpen: () => void;
  active: boolean;
  title: string;
  subtitle: string;
  meta: string;
  badge: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          active && "bg-muted/60",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{title}</span>
            {badge}
          </div>
          <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
        </div>
        <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
          {meta}
        </span>
      </button>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[1, 2, 3, 4].map((row) => (
        <Skeleton key={row} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function RequestsPanel() {
  const [support, setSupport] = useState<SupportRequest[] | null>(null);
  const [matches, setMatches] = useState<MatchRequest[] | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/requests");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Richieste non caricate", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        setSupport([]);
        setMatches([]);
        return;
      }

      setSupport(payload.support ?? []);
      setMatches(payload.matches ?? []);
    } catch {
      toast.error("Richieste non caricate", {
        description: "Controlla la connessione e riprova.",
      });
      setSupport([]);
      setMatches([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * `?support=` e `?match=` sono l'atterraggio delle notifiche: aprono la
   * scheda giusta e scelgono da soli l'elenco in cui si trova.
   */
  const searchParams = useSearchParams();
  const linkedSupport = searchParams.get("support");
  const linkedMatch = searchParams.get("match");

  const [tab, setTab] = useState<"support" | "matches">(
    linkedMatch && !linkedSupport ? "matches" : "support",
  );
  const [selected, setSelected] = useState<Selection>(() => {
    if (linkedSupport) return { kind: "support", id: linkedSupport };
    if (linkedMatch) return { kind: "match", id: linkedMatch };
    return null;
  });

  const openSupport = useMemo(
    () => (support ?? []).filter(isOpenSupport).length,
    [support],
  );
  const openMatches = useMemo(
    () => (matches ?? []).filter(isOpenMatch).length,
    [matches],
  );

  const loading = support === null || matches === null;

  return (
    <>
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="size-4" />
              Assistenza
            </CardTitle>
            <CardDescription>Da smaltire</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? <Skeleton className="h-8 w-10" /> : openSupport}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              Giocatori
            </CardTitle>
            <CardDescription>Partite da completare</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? <Skeleton className="h-8 w-10" /> : openMatches}
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="size-4" />
              Ricevute in tutto
            </CardTitle>
            <CardDescription>Da quando esiste il modulo</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? (
              <Skeleton className="h-8 w-10" />
            ) : (
              support.length + matches.length
            )}
          </CardContent>
        </Card>
      </section>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "support" | "matches")}
        className="space-y-3"
      >
        <TabsList className="w-full md:w-max">
          <TabsTrigger value="support">Assistenza ({openSupport})</TabsTrigger>
          <TabsTrigger value="matches">Giocatori ({openMatches})</TabsTrigger>
        </TabsList>

        <TabsContent value="support">
          <div className="overflow-hidden rounded-lg border">
            {loading ? (
              <ListSkeleton />
            ) : support.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Inbox className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>Nessuna richiesta</EmptyTitle>
                  <EmptyDescription>
                    Le richieste inviate dal modulo di assistenza compaiono qui.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y bg-white">
                {support.map((request) => (
                  <RequestRow
                    key={request._id}
                    active={
                      selected?.kind === "support" &&
                      selected.id === request._id
                    }
                    onOpen={() =>
                      setSelected({ kind: "support", id: request._id })
                    }
                    title={request.name}
                    subtitle={`${request.email} · ${request.phone}`}
                    meta={formatWhen(request.createdAt)}
                    badge={<SupportStatusBadge status={request.status} />}
                  />
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="matches">
          <div className="overflow-hidden rounded-lg border">
            {loading ? (
              <ListSkeleton />
            ) : matches.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>Nessuna richiesta</EmptyTitle>
                  <EmptyDescription>
                    Chi cerca compagni di partita dal sito compare qui.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y bg-white">
                {matches.map((request) => (
                  <RequestRow
                    key={request._id}
                    active={
                      selected?.kind === "match" && selected.id === request._id
                    }
                    onOpen={() =>
                      setSelected({ kind: "match", id: request._id })
                    }
                    title={request.name}
                    subtitle={`Cerca ${missingPlayersLabel(request.missingPlayers)} · ${levelLabel(request.level)} · ${request.email}`}
                    meta={formatWhen(request.matchDate)}
                    badge={<MatchStatusBadge status={request.status} />}
                  />
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <RequestSheet
        selection={selected}
        support={support ?? []}
        matches={matches ?? []}
        onOpenChange={(open) => !open && setSelected(null)}
        onChanged={() => void load()}
      />
    </>
  );
}
