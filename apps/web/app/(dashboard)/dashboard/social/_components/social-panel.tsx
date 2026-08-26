"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CheckCheck, Clock, Megaphone, TriangleAlert } from "lucide-react";
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

import { PostSheet } from "./post-sheet";
import { SocialStatusBadge } from "./status-badge";
import { FORMAT_LABELS, KIND_LABELS, type SocialPost } from "./types";

/**
 * L'elenco delle bozze e delle pubblicazioni.
 *
 * Calcato sul pannello delle richieste, compresa la scelta di leggere via
 * `fetch` da una route dello staff invece che con `useQuery`: qui passa il
 * campo `facts`, cioè il testo consegnato al modello, e non è materiale da
 * lasciare in mano al browser di chiunque.
 *
 * Le schede non seguono gli stati uno per uno ma **cosa tocca a chi guarda**:
 * ciò che aspetta una decisione, ciò che è in viaggio da solo, ciò che è
 * uscito, e il cimitero. Nove stati in nove schede sarebbero stati un'ottima
 * rappresentazione della macchina e una pessima schermata.
 */

const GROUPS = {
  review: {
    label: "Da approvare",
    statuses: ["pending_review", "needs_attention"],
  },
  queued: {
    label: "In viaggio",
    statuses: ["drafting", "queued", "publishing"],
  },
  published: { label: "Pubblicati", statuses: ["published"] },
  archive: {
    label: "Archivio",
    statuses: ["rejected", "skipped", "failed"],
  },
} as const;

type GroupId = keyof typeof GROUPS;

interface Payload {
  counts: Record<string, number>;
  posts: SocialPost[];
}

export function SocialPanel() {
  const params = useSearchParams();
  const [data, setData] = useState<Payload | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/social");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Bozze non caricate", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        setData({ counts: {}, posts: [] });
        return;
      }

      setData(payload);
    } catch {
      toast.error("Bozze non caricate", {
        description: "Controlla la connessione e riprova.",
      });
      setData({ counts: {}, posts: [] });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // L'avviso su Hark linka una bozza precisa: aprirla da sola risparmia a chi
  // arriva di cercarla in un elenco.
  useEffect(() => {
    const wanted = params.get("post");
    if (wanted) setSelected(wanted);
  }, [params]);

  const posts = data?.posts;
  const loading = posts === undefined;

  const grouped = useMemo(() => {
    const empty = {
      review: [],
      queued: [],
      published: [],
      archive: [],
    } as Record<GroupId, SocialPost[]>;

    if (!posts) return empty;

    for (const post of posts) {
      for (const [id, group] of Object.entries(GROUPS)) {
        if ((group.statuses as readonly string[]).includes(post.status)) {
          empty[id as GroupId].push(post);
        }
      }
    }

    return empty;
  }, [posts]);

  const open = posts?.find((post) => post.id === selected) ?? null;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Metric
          title="Da approvare"
          icon={<Clock className="size-4" />}
          value={loading ? null : grouped.review.length}
          hint="Aspettano il tuo via libera"
        />
        <Metric
          title="Pubblicati"
          icon={<CheckCheck className="size-4" />}
          value={loading ? null : grouped.published.length}
          hint="Già usciti su Instagram"
        />
        <Metric
          title="Non riusciti"
          icon={<TriangleAlert className="size-4" />}
          value={loading ? null : (data?.counts.failed ?? 0)}
          hint="Da guardare quando capita"
        />
      </section>

      <Tabs defaultValue="review">
        <TabsList>
          {Object.entries(GROUPS).map(([id, group]) => (
            <TabsTrigger key={id} value={id}>
              {group.label}
              {!loading && grouped[id as GroupId].length > 0 ? (
                <span className="ml-1.5 text-muted-foreground">
                  {grouped[id as GroupId].length}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.keys(GROUPS).map((id) => (
          <TabsContent key={id} value={id} className="mt-4">
            {loading ? (
              <ListSkeleton />
            ) : grouped[id as GroupId].length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Megaphone className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>Niente qui</EmptyTitle>
                  <EmptyDescription>
                    I contenuti generati dal circolo compaiono in questo elenco.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <ul className="divide-y bg-white">
                  {grouped[id as GroupId].map((post) => (
                    <li key={post.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(post.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {post.poster?.headline ?? "Senza titolo"}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {KIND_LABELS[post.kind]} ·{" "}
                            {FORMAT_LABELS[post.format]} ·{" "}
                            {format(post.createdAt, "d MMM yyyy, HH:mm", {
                              locale: it,
                            })}
                          </span>
                        </span>
                        <SocialStatusBadge status={post.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <PostSheet
        post={open}
        onClose={() => setSelected(null)}
        onChanged={load}
      />
    </div>
  );
}

function Metric({
  title,
  icon,
  value,
  hint,
}: {
  title: string;
  icon: React.ReactNode;
  value: number | null;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-10" />
        ) : (
          <p className="text-3xl font-semibold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((row) => (
        <Skeleton key={row} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
