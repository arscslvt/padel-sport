"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Radio } from "lucide-react";

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
    <div className="space-y-8 mt-6">
      {active.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <h2 className="text-2xl font-semibold">In corso oggi</h2>
            <span className="text-sm text-muted-foreground">
              ({active.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <h2 className="text-2xl font-semibold mb-4">
          {active.length > 0 ? "Altri tornei" : "Seleziona un torneo"}
        </h2>
        {others.length === 0 && active.length === 0 ? (
          <p className="text-muted-foreground">Nessun torneo trovato.</p>
        ) : others.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nessun altro torneo disponibile.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
  return (
    <Card
      className={
        highlighted
          ? "bg-background text-foreground border-primary/60 ring-1 ring-primary/30 shadow-md"
          : "bg-background text-foreground border-border"
      }
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{tournament.name}</CardTitle>
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-primary/15 text-primary px-2 py-0.5 rounded-full shrink-0">
              <Radio className="h-3 w-3" />
              Live
            </span>
          )}
        </div>
        <CardDescription>
          Stato:{" "}
          <span className="font-semibold uppercase text-xs">
            {tournament.status}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4">
          Inizio:{" "}
          {format(new Date(tournament.startDate), "dd MMMM yyyy", {
            locale: it,
          })}
        </p>
        <Button asChild className="w-full">
          <Link href={`/management/${tournament.slug}`}>Gestisci</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
