"use client";

import { useQuery } from "convex/react";
import { Check, Clock3, Crown, Radio, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { cn } from "@/lib/utils";

type Stage = "quarter" | "semi" | "final";

const stages: Array<{ key: Stage; label: string }> = [
  { key: "quarter", label: "Quarti" },
  { key: "semi", label: "Semifinali" },
  { key: "final", label: "Finale" },
];

type BracketMatch = {
  _id: string;
  bracketPosition?: number;
  status: "scheduled" | "in_progress" | "finished";
  scheduledAt?: string;
  points: { teamA: number; teamB: number };
  sets: Array<{ teamAPoints: number; teamBPoints: number }>;
  teams: Array<{
    name: string;
    players: Array<{ name: string }>;
  }>;
};

export default function KnockoutBracket({
  tournamentCategoryId,
  compact = false,
}: {
  tournamentCategoryId: string;
  compact?: boolean;
}) {
  const quarters = useQuery(
    api.modules.tournaments.matches.get.getMatchesByCategoryAndStage,
    { tournamentCategoryId, stage: "quarter" },
  );
  const semis = useQuery(
    api.modules.tournaments.matches.get.getMatchesByCategoryAndStage,
    { tournamentCategoryId, stage: "semi" },
  );
  const finals = useQuery(
    api.modules.tournaments.matches.get.getMatchesByCategoryAndStage,
    { tournamentCategoryId, stage: "final" },
  );

  const matchesByStage: Record<Stage, BracketMatch[] | undefined> = {
    quarter: quarters as BracketMatch[] | undefined,
    semi: semis as BracketMatch[] | undefined,
    final: finals as BracketMatch[] | undefined,
  };
  const loading = stages.some(({ key }) => matchesByStage[key] === undefined);
  const hasMatches = stages.some(({ key }) => matchesByStage[key]?.length);
  const finalMatch = matchesByStage.final?.[0];
  const championIndex =
    finalMatch?.status === "finished"
      ? finalMatch.points.teamA > finalMatch.points.teamB
        ? 0
        : finalMatch.points.teamB > finalMatch.points.teamA
          ? 1
          : null
      : null;

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border bg-muted/20" />;
  }

  if (!hasMatches) {
    return (
      <div className="rounded-xl border border-dashed px-5 py-10 text-center">
        <Trophy className="mx-auto mb-3 size-7 text-muted-foreground" />
        <p className="font-medium">Tabellone non ancora generato</p>
        <p className="mt-1 text-sm text-muted-foreground">
          La fase finale apparirà qui dopo la selezione delle qualificate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {championIndex !== null && finalMatch && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <Crown className="size-6 text-amber-500" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Campioni
            </p>
            <p className="font-heading text-lg font-bold">
              {finalMatch.teams[championIndex]?.name}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto pb-3">
        <div className="grid min-w-[820px] grid-cols-3 gap-5">
          {stages.map(({ key, label }) => {
            const matches = [...(matchesByStage[key] ?? [])].sort(
              (a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0),
            );
            return (
              <section key={key} className="flex min-w-0 flex-col">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="font-heading text-sm font-bold uppercase tracking-wider">
                    {label}
                  </h3>
                  <Badge variant="outline">{matches.length}</Badge>
                </div>
                <div
                  className={cn(
                    "flex flex-1 flex-col justify-around gap-4",
                    compact && "gap-2",
                  )}
                >
                  {matches.length ? (
                    matches.map((match, index) => (
                      <BracketMatchCard
                        key={match._id}
                        match={match}
                        number={index + 1}
                      />
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      In attesa della fase precedente
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BracketMatchCard({
  match,
  number,
}: {
  match: BracketMatch;
  number: number;
}) {
  const winner =
    match.status === "finished"
      ? match.points.teamA > match.points.teamB
        ? 0
        : match.points.teamB > match.points.teamA
          ? 1
          : null
      : null;

  return (
    <Card className="overflow-hidden border-border/80 bg-background py-0 shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Match {number}</span>
        <MatchStatus match={match} />
      </div>
      <CardContent className="p-0">
        {match.teams.map((team, index) => (
          <div
            key={`${match._id}-${index}`}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5",
              index === 0 && "border-b",
              winner === index && "bg-emerald-500/10",
            )}
          >
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm",
                  winner === index && "font-bold",
                )}
              >
                {team.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {team.players.map((player) => player.name).join(" / ")}
              </p>
            </div>
            <span
              className={cn(
                "grid size-7 shrink-0 place-content-center rounded-md bg-muted text-sm font-bold",
                winner === index && "bg-emerald-500 text-white",
              )}
            >
              {index === 0 ? match.points.teamA : match.points.teamB}
            </span>
          </div>
        ))}
        {match.sets.length > 0 && (
          <div className="flex gap-2 border-t px-3 py-1.5 text-[10px] text-muted-foreground">
            {match.sets.map((set, index) => (
              <span key={`${set.teamAPoints}-${set.teamBPoints}-${index}`}>
                S{index + 1} {set.teamAPoints}-{set.teamBPoints}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MatchStatus({ match }: { match: BracketMatch }) {
  if (match.status === "finished") {
    return <Check className="size-3.5 text-emerald-500" />;
  }
  if (match.status === "in_progress") {
    return <Radio className="size-3.5 animate-pulse text-red-500" />;
  }
  return (
    <span className="flex items-center gap-1">
      <Clock3 className="size-3" />
      {match.scheduledAt
        ? new Intl.DateTimeFormat("it-IT", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(match.scheduledAt))
        : "Da programmare"}
    </span>
  );
}
