"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Radio,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";

type Tournament = {
  _id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate?: string;
  status: "upcoming" | "live" | "completed";
};

const todayKey = () => format(new Date(), "yyyy-MM-dd");

const isActiveToday = (t: Tournament, today: string) => {
  if (t.status === "live") return true;
  const start = t.startDate.slice(0, 10);
  const end = t.endDate?.slice(0, 10);
  if (end) return start <= today && today <= end;
  return start === today;
};

export default function ManagementPage() {
  const tournaments = useQuery(api.modules.tournaments.get.list) as
    | Tournament[]
    | undefined;

  if (tournaments === undefined) {
    return (
      <div className="flex justify-center mt-10">
        <Spinner />
      </div>
    );
  }

  const today = todayKey();
  const active = tournaments.filter((t) => isActiveToday(t, today));
  const others = tournaments.filter((t) => !isActiveToday(t, today));

  return (
    <div className="space-y-10 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="size-3.5" /> Centro operativo
          </p>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            Quale torneo gestiamo?
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Accedi rapidamente a risultati, programmazione e fasi finali.
          </p>
        </div>
        <Badge variant="outline" className="w-fit px-3 py-1.5">
          {tournaments.length} {tournaments.length === 1 ? "torneo" : "tornei"}
        </Badge>
      </div>

      {active.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <h2 className="text-lg font-semibold">Da gestire oggi</h2>
            <span className="text-sm text-muted-foreground">
              ({active.length})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {active.map((tournament) => (
              <TournamentCard
                key={tournament._id}
                tournament={tournament}
                highlighted
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          {active.length > 0 ? "Altri tornei" : "Seleziona un torneo"}
        </h2>
        {others.length === 0 && active.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <Trophy className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">Nessun torneo trovato</p>
          </div>
        ) : others.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nessun altro torneo disponibile.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {others.map((tournament) => (
              <TournamentCard key={tournament._id} tournament={tournament} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TournamentCard({
  tournament,
  highlighted = false,
}: {
  tournament: Tournament;
  highlighted?: boolean;
}) {
  const isLive = tournament.status === "live";
  const statusLabel = {
    upcoming: "In programma",
    live: "In corso",
    completed: "Concluso",
  }[tournament.status];
  const endDate = tournament.endDate
    ? format(new Date(tournament.endDate), "dd MMM yyyy", { locale: it })
    : null;
  return (
    <Card
      className={`group relative overflow-hidden py-0 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        highlighted
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card"
      }`}
    >
      {highlighted && <div className="h-1 w-full bg-primary" />}
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-heading text-lg leading-snug">
            {tournament.name}
          </CardTitle>
          <Badge
            variant={isLive ? "default" : "secondary"}
            className="shrink-0"
          >
            {isLive && <Radio className="h-3 w-3" />}
            {tournament.status === "completed" && (
              <CheckCircle2 className="h-3 w-3" />
            )}
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" />
          <span>
            {format(new Date(tournament.startDate), "dd MMM yyyy", {
              locale: it,
            })}
            {endDate && ` — ${endDate}`}
          </span>
        </div>
        <Button asChild className="w-full justify-between">
          <Link href={`/management/${tournament.slug}`}>
            Apri console
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
