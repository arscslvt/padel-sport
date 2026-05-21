"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ClockFading, Play, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerHeader,
} from "@/components/ui/responsive-drawer";
import { cn } from "@/lib/utils";
import { useTournamentStore } from "../../stores/tournament.store";

function renderPlayerName(firstName: string | undefined, lastName: string) {
  if (!firstName) return lastName;
  return `${firstName} ${lastName}`;
}

export default function MatchDetailsDrawer() {
  const open = useTournamentStore((state) => state.matchDetailsDrawerOpen);
  const setOpen = useTournamentStore(
    (state) => state.setMatchDetailsDrawerOpen,
  );
  const match = useTournamentStore((state) => state.selectedMatchDetails);

  if (!match) return null;

  const teamA = match.teams[0];
  const teamB = match.teams[1];

  const displayDate = match.scheduledAt
    ? format(new Date(match.scheduledAt), "EEEE d MMMM, HH:mm", { locale: it })
    : "Da programmare";

  const isLive = match.status === "in_progress";
  const isFinished = match.status === "finished";

  return (
    <ResponsiveDrawer open={open} setOpen={setOpen}>
      <ResponsiveDrawerContent className="p-0 sm:max-w-md overflow-hidden bg-background">
        <div className="flex flex-col">
          {/* Header */}
          <div className="p-6 pb-4 bg-muted/30 border-b border-border/50">
            <ResponsiveDrawerHeader
              visuallyHidden
              title="Dettagli Match"
              description="Informazioni sul match selezionato"
            />

            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col gap-1">
                {(match.categoryName || match.groupName) && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {match.categoryName && <span>{match.categoryName}</span>}
                    {match.categoryName && match.groupName && (
                      <span className="text-muted/50">•</span>
                    )}
                    {match.groupName && <span>{match.groupName}</span>}
                  </div>
                )}
              </div>
              <div>
                {isLive && (
                  <Badge
                    variant="destructive"
                    className="animate-pulse shadow-sm shadow-destructive/20 gap-1.5"
                  >
                    <Play className="size-3 fill-current" /> Live
                  </Badge>
                )}
                {isFinished && (
                  <Badge
                    variant="outline"
                    className="bg-accent/10 border-accent text-accent font-semibold"
                  >
                    Terminata
                  </Badge>
                )}
                {match.status === "scheduled" && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <ClockFading className="size-3" /> In programma
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClockFading className="size-4" /> {displayDate}
              </span>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-8">
            {/* Teams Details */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col max-w-[45%]">
                  <span
                    className={cn(
                      "font-semibold text-lg leading-tight mb-2",
                      isFinished &&
                        match.points?.teamA > match.points?.teamB &&
                        "text-accent",
                    )}
                  >
                    {teamA.name}
                  </span>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {teamA.players.map(
                      (
                        p: { firstName?: string; lastName: string },
                        i: number,
                      ) => (
                        <span key={`teamA-${p.lastName}-${i}`}>
                          {renderPlayerName(p.firstName, p.lastName)}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <div className="text-center font-bold text-muted-foreground text-sm px-2">
                  VS
                </div>

                <div className="flex flex-col max-w-[45%] text-right items-end">
                  <span
                    className={cn(
                      "font-semibold text-lg leading-tight mb-2",
                      isFinished &&
                        match.points?.teamB > match.points?.teamA &&
                        "text-accent",
                    )}
                  >
                    {teamB.name}
                  </span>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground text-right items-end">
                    {teamB.players.map(
                      (
                        p: { firstName?: string; lastName: string },
                        i: number,
                      ) => (
                        <span key={`teamB-${p.lastName}-${i}`}>
                          {renderPlayerName(p.firstName, p.lastName)}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sets & Points */}
            {(isLive || isFinished) && (
              <div className="bg-muted/50 rounded-xl border border-border/50 overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-center border-collapse">
                  <thead>
                    <tr className="divide-x divide-border/50 border-b border-border/50 bg-muted">
                      <th className="p-3 text-xs font-semibold text-muted-foreground text-left min-w-30">
                        Team
                      </th>
                      {match.sets?.map((_, idx: number) => {
                        const key = `set-header-${idx}`;
                        return (
                          <th
                            key={key}
                            className="p-3 text-xs font-semibold text-muted-foreground min-w-14 w-14"
                          >
                            Set {idx + 1}
                          </th>
                        );
                      })}
                      {isLive && (
                        <th className="p-3 text-xs font-semibold text-destructive min-w-14 w-14">
                          P.ti
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <tr className="divide-x divide-border/50">
                      <td className="p-3 font-semibold text-sm flex items-center gap-2 text-left">
                        <span className="truncate">{teamA.name}</span>
                        {isFinished &&
                          match.points?.teamA > match.points?.teamB && (
                            <Trophy className="size-4 text-amber-400 shrink-0" />
                          )}
                      </td>
                      {match.sets?.map(
                        (
                          set: { teamAPoints: number; teamBPoints: number },
                          idx: number,
                        ) => {
                          const key = `set-a-${idx}`;
                          return (
                            <td
                              key={key}
                              className={cn(
                                "p-3 font-semibold",
                                set.teamAPoints > set.teamBPoints
                                  ? "text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {set.teamAPoints}
                            </td>
                          );
                        },
                      )}
                      {isLive && (
                        <td className="p-3 font-bold text-destructive">
                          {match.points?.teamA ?? 0}
                        </td>
                      )}
                    </tr>
                    <tr className="divide-x divide-border/50">
                      <td className="p-3 font-semibold text-sm flex items-center gap-2 text-left">
                        <span className="truncate">{teamB.name}</span>
                        {isFinished &&
                          match.points?.teamB > match.points?.teamA && (
                            <Trophy className="size-4 text-amber-400 shrink-0" />
                          )}
                      </td>
                      {match.sets?.map(
                        (
                          set: { teamAPoints: number; teamBPoints: number },
                          idx: number,
                        ) => {
                          const key = `set-b-${idx}`;
                          return (
                            <td
                              key={key}
                              className={cn(
                                "p-3 font-semibold",
                                set.teamBPoints > set.teamAPoints
                                  ? "text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {set.teamBPoints}
                            </td>
                          );
                        },
                      )}
                      {isLive && (
                        <td className="p-3 font-bold text-destructive">
                          {match.points?.teamB ?? 0}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}
