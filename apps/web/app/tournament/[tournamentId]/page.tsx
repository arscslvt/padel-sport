"use client";

import { useQuery } from "convex/react";
import { CalendarOff, ChevronRight } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Item, ItemContent, ItemHeader, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/components/tournaments/_generated/dataModel";
import GroupTabs, {
  GroupMatchesList,
  useGroupTabs,
} from "../components/groups/groups.tabs";
import MatchCard from "../components/groups/match.card";
import KnockoutBracket from "../components/knockout-bracket";
import LiveDot from "../components/live-dot";
import MatchDetailsDrawer from "../components/matches/match-details.drawer";
import PlayerSearchDrawer from "../components/matches/player-search.drawer";
import TeamsListDrawer from "../components/teams/teams-list.drawer";
import { useTournamentStore } from "../stores/tournament.store";
import { columns } from "./columns";
import { DataTable } from "./data-table";

function formatPlayerName(firstName: string | undefined, lastName: string) {
  if (!firstName) return lastName;
  const initial = firstName.charAt(0).toUpperCase();
  return `${lastName} ${initial}.`;
}

const CATEGORY_STATUS_DISPLAY: {
  [key in Doc<"tournamentCategories">["currentStage"]]: string;
} = {
  group: "Fase a gironi",
  quarter: "Quarti di finale",
  semi: "Semifinali",
  final: "Finale",
  completed: "Completata",
};

interface LiveMatchTeam {
  name: string;
  players: { firstName?: string; lastName: string }[];
}

interface LiveMatchSet {
  teamAPoints: number;
  teamBPoints: number;
}

interface LiveMatch {
  _id: string;
  status: "scheduled" | "in_progress" | "finished";
  categoryId?: string;
  categoryName?: string;
  groupName?: string;
  stage?: string;
  teams: LiveMatchTeam[];
  points: { teamA: number; teamB: number };
  sets: LiveMatchSet[];
  scheduledAt?: string | null;
}

export default function TournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [showScrollShadow, setShowScrollShadow] = useState(false);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    setShowScrollShadow(scrollLeft + clientWidth < scrollWidth - 2);
  };

  const setTournamentId = useTournamentStore((state) => state.setTournamentId);
  const setSelectedCategoryId = useTournamentStore(
    (state) => state.setSelectedCategoryId,
  );
  const setTeamsDrawerOpen = useTournamentStore(
    (state) => state.setTeamsDrawerOpen,
  );
  const setSelectedMatchDetails = useTournamentStore(
    (state) => state.setSelectedMatchDetails,
  );
  const setMatchDetailsDrawerOpen = useTournamentStore(
    (state) => state.setMatchDetailsDrawerOpen,
  );

  const selectedCategoryId = useTournamentStore(
    (state) => state.selectedCategoryId,
  );

  const teamsDrawerOpen = useTournamentStore((state) => state.teamsDrawerOpen);
  const searchPlayer = useTournamentStore((state) => state.searchPlayer);
  const setSearchPlayer = useTournamentStore((state) => state.setSearchPlayer);

  const tournament = useQuery(api.modules.tournaments.get.bySlug, {
    slug: tournamentId,
  });

  const categories = useQuery(
    api.modules.tournaments.categories.get.byTournamentId,
    tournament?._id ? { tournamentId: tournament._id } : "skip",
  );

  const liveMatches = useQuery(
    api.modules.tournaments.matches.get.getLiveMatchesByTournamentId,
    tournament?._id ? { tournamentId: tournament._id } : "skip",
  );

  const completedTodayMatchesData = useQuery(
    api.modules.tournaments.matches.get.getTodayCompletedMatchesByTournamentId,
    tournament?._id ? { tournamentId: tournament._id } : "skip",
  );

  const selectedGroupId = useGroupTabs((state) => state.selectedGroupId);

  const activeCategory = categories?.find((c) => c._id === selectedCategoryId);
  const activeStage = activeCategory?.currentStage ?? "group";

  const standings = useQuery(
    api.modules.tournaments.groups.get.getGroupStandings,
    activeStage === "group" && selectedGroupId
      ? { groupId: selectedGroupId }
      : "skip",
  );

  useEffect(() => {
    if (tournament?._id) {
      setTournamentId(tournament._id);
    }
  }, [tournament?._id, setTournamentId]);

  useEffect(() => {
    if (categories && categories.length > 0) {
      if (
        !selectedCategoryId ||
        !categories.find((c) => c._id === selectedCategoryId)
      ) {
        setSelectedCategoryId(categories[0]._id);
      }
    }
  }, [categories, selectedCategoryId, setSelectedCategoryId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (categories && tabsScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = tabsScrollRef.current;
        setShowScrollShadow(scrollLeft + clientWidth < scrollWidth - 2);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [categories]);

  if (tournament === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-2 items-center px-3 py-2 rounded-md bg-muted">
          <Spinner />
          <p className="text-center text-muted-foreground">
            Caricamento torneo...
          </p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant={"icon"}>
            <CalendarOff className="text-accent" />
          </EmptyMedia>
          <EmptyTitle>Il torneo non esiste</EmptyTitle>
          <EmptyDescription>
            Il torneo che stai cercando non esiste o è stato rimosso.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent></EmptyContent>
      </Empty>
    );
  }

  const currentLiveMatches =
    (liveMatches as unknown as LiveMatch[])?.filter(
      (m) => m.status === "in_progress",
    ) || [];
  const completedTodayMatches =
    (completedTodayMatchesData as unknown as LiveMatch[])?.filter(
      (m) => m.status === "finished",
    ) || [];

  return (
    <main className="w-full px-3 md:px-0">
      <div className="flex flex-col mb-4">
        <h1 className="font-heading text-white text-xl font-bold">
          {tournament.name}
        </h1>

        {tournament.comment && (
          <Item className="bg-muted/30 mt-2 border-2 border-muted/50">
            <ItemHeader>
              <ItemTitle>{tournament.comment.title}</ItemTitle>
            </ItemHeader>
            <ItemContent className="whitespace-pre-wrap">
              {tournament.comment.content}
            </ItemContent>
          </Item>
        )}
      </div>

      <div className="mb-8 mt-6">
        {currentLiveMatches.length > 0 && (
          <div className="mb-8">
            <div className="mb-4">
              <h3 className="font-medium font-heading flex flex-row items-center gap-2 text-destructive">
                <LiveDot />{" "}
                <span className="uppercase font-bold tracking-wide">
                  Partite in corso
                </span>
              </h3>
              <p className="text-sm mt-1 text-muted-foreground">
                Le sfide attualmente in fase di svolgimento in tutte le
                categorie.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentLiveMatches.map((match) => (
                <div key={match._id} className="flex flex-col gap-2">
                  <div className="text-xs text-muted-foreground flex gap-1.5 items-center px-1">
                    <span className="font-semibold text-foreground uppercase tracking-wider">
                      {match.categoryName}
                    </span>
                    {match.groupName && (
                      <>
                        <span className="text-muted/50">•</span>
                        <span className="font-medium text-muted-foreground">
                          {match.groupName}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col rounded-lg border-2 border-destructive/70 shadow-sm shadow-destructive/10 overflow-clip">
                    <MatchCard
                      onClick={() => {
                        setSelectedMatchDetails(match);
                        setMatchDetailsDrawerOpen(true);
                      }}
                      teams={match.teams.map((team) => ({
                        name: team.name,
                        players: team.players.map((player) =>
                          formatPlayerName(player.firstName, player.lastName),
                        ),
                      }))}
                      points={{
                        teamAPoints: match.points.teamA,
                        teamBPoints: match.points.teamB,
                      }}
                      sets={match.sets.map((set) => ({
                        teamAGames: set.teamAPoints,
                        teamBGames: set.teamBPoints,
                      }))}
                      status={match.status}
                      date={match.scheduledAt ?? undefined}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {completedTodayMatches.length > 0 && (
          <div className="mb-8">
            <div className="mb-4">
              <h3 className="font-medium font-heading flex flex-row items-center gap-2">
                <span className="uppercase font-bold tracking-wide">
                  Risultati di oggi
                </span>
              </h3>
              <p className="text-sm mt-1 text-muted-foreground">
                Le sfide terminate nella giornata odierna.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedTodayMatches.map((match) => (
                <div key={match._id} className="flex flex-col gap-2">
                  <div className="text-xs text-muted-foreground flex gap-1.5 items-center px-1">
                    <span className="font-semibold text-foreground uppercase tracking-wider">
                      {match.categoryName}
                    </span>
                    {match.groupName && (
                      <>
                        <span className="text-muted/50">•</span>
                        <span className="font-medium text-muted-foreground">
                          {match.groupName}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col rounded-lg border border-border shadow-sm overflow-clip">
                    <MatchCard
                      onClick={() => {
                        setSelectedMatchDetails(match);
                        setMatchDetailsDrawerOpen(true);
                      }}
                      teams={match.teams.map((team) => ({
                        name: team.name,
                        players: team.players.map((player) =>
                          formatPlayerName(player.firstName, player.lastName),
                        ),
                      }))}
                      points={{
                        teamAPoints: match.points.teamA,
                        teamBPoints: match.points.teamB,
                      }}
                      sets={match.sets.map((set) => ({
                        teamAGames: set.teamAPoints,
                        teamBGames: set.teamBPoints,
                      }))}
                      status={match.status}
                      date={match.scheduledAt ?? undefined}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sticky top-16 md:top-22 z-30 border bg-background rounded-xl overflow-clip shadow-xl shadow-background divide-y">
        <Tabs
          value={
            categories?.find((c) => c._id === selectedCategoryId)?.slug ||
            "intermedio"
          }
          onValueChange={(val) => {
            const cat = categories?.find((c) => c.slug === val);
            if (cat) setSelectedCategoryId(cat._id);
          }}
          className="w-full"
        >
          <div
            className="bg-muted relative overflow-x-auto hide-scrollbar"
            ref={tabsScrollRef}
            onScroll={handleScroll}
          >
            <TabsList className="bg-transparent w-full justify-start px-1 h-11 [&_data-[state=active]]:sticky [&_data-[state=active]]:left-0">
              {categories?.map((category) => (
                <TabsTrigger
                  key={category.slug}
                  value={category.slug}
                  className="rounded-t-lg first:rounded-bl-sm last:rounded-br-sm"
                >
                  {category?.icon && (
                    <DynamicIcon name={category.icon as IconName} />
                  )}
                  {category.name}
                </TabsTrigger>
              ))}
              <div className="flex-1"></div>
              <div className="sticky right-0 bg-muted z-10 flex items-center pr-1 pl-2">
                <div
                  className={`absolute left-0 top-0 bottom-0 w-8 -translate-x-full bg-linear-to-r from-transparent to-muted pointer-events-none transition-opacity duration-300 ${showScrollShadow ? "opacity-100" : "opacity-0"}`}
                />
                <Button
                  size="icon"
                  variant={"ghost"}
                  className="rounded-lg"
                  onClick={() =>
                    setSearchPlayer(searchPlayer !== false ? false : "")
                  }
                >
                  <DynamicIcon name="search" className="size-4" />
                </Button>
              </div>
            </TabsList>
          </div>
        </Tabs>
        <div className="flex divide-x bg-background">
          <div className="flex-1 flex items-center justify-center font-medium gap-3 min-h-12 overflow-clip text-sm">
            {tournament.status === "live" && <LiveDot />}
            <span className="text-sm font-semibold">
              {tournament.status === "live"
                ? selectedCategoryId
                  ? CATEGORY_STATUS_DISPLAY[
                      categories?.find((c) => c._id === selectedCategoryId)
                        ?.currentStage ?? "group"
                    ]
                  : "Seleziona una categoria"
                : ""}
              {tournament.status === "completed" && "Torneo completato"}
              {tournament.status === "upcoming" &&
                `Inizierà il ${new Date(tournament.startDate).toLocaleDateString("it-IT", {})}`}
            </span>
          </div>

          <div className="min-w-34 w-34 flex items-center justify-center px-1.5">
            {selectedCategoryId && (
              <TeamsListDrawer
                open={teamsDrawerOpen}
                setOpen={(open) => setTeamsDrawerOpen(open)}
                categoryId={selectedCategoryId}
                categoryName={
                  categories?.find((c) => c._id === selectedCategoryId)?.name
                }
              />
            )}
            <Button
              className="rounded-xs rounded-br-sm"
              variant={"ghost"}
              size={"sm"}
              onClick={() => setTeamsDrawerOpen(true)}
            >
              {categories?.find((c) => c._id === selectedCategoryId)?.teams
                ?.length || 0}{" "}
              Squadre <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      {selectedCategoryId && activeStage === "group" && (
        <>
          <div className="mt-8 mb-4">
            <GroupTabs tournamentCategoryId={selectedCategoryId} />
          </div>

          <div className="mt-8">
            <DataTable columns={columns} data={standings || []} />
          </div>

          <div className="mt-8">
            <div className="mb-4">
              <h3 className="font-medium font-heading">
                Match della categoria
              </h3>
              <p className="text-sm mt-1 text-muted-foreground">
                Qui puoi vedere i match della categoria selezionata, con i
                risultati aggiornati in tempo reale.
              </p>
            </div>

            <div className="mb-4">
              <GroupMatchesList tournamentCategoryId={selectedCategoryId} />
            </div>
          </div>
        </>
      )}

      {selectedCategoryId && activeStage !== "group" && (
        <div className="mt-8 space-y-6">
          <div>
            <h2 className="font-heading text-lg font-bold">Fasi finali</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Il tabellone si aggiorna in tempo reale con risultati e passaggi
              del turno.
            </p>
          </div>
          <KnockoutBracket tournamentCategoryId={selectedCategoryId} />
        </div>
      )}

      <PlayerSearchDrawer />
      <MatchDetailsDrawer />
    </main>
  );
}
