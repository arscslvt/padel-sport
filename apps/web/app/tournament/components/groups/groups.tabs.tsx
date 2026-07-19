import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MatchCard from "./match.card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Delete, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { create } from "zustand";
import { DynamicIcon } from "lucide-react/dynamic";
import LiveDot from "../live-dot";
import { useTournamentStore } from "../../stores/tournament.store";

interface GroupTabsProps {
  tournamentCategoryId: string;
}

function formatPlayerName(firstName: string | undefined, lastName: string) {
  if (!firstName) return lastName;
  const initial = firstName.charAt(0).toUpperCase();
  return `${lastName} ${initial}.`;
}

interface GroupTabsState {
  selectedGroupId: string | null;
  searchTeam: string | false;

  setSelectedGroupId: (groupId: string | null) => void;
  setSearchTeam: (search: string | false) => void;
}

export const useGroupTabs = create<GroupTabsState>((set) => ({
  selectedGroupId: null,
  searchTeam: false,

  setSelectedGroupId: (groupId: string | null) =>
    set({ selectedGroupId: groupId }),
  setSearchTeam: (search: string | false) => set({ searchTeam: search }),
}));

export default function GroupTabs({ tournamentCategoryId }: GroupTabsProps) {
  const selectedGroupId = useGroupTabs((state) => state.selectedGroupId);
  const searchTeam = useGroupTabs((state) => state.searchTeam);

  const setSelectedGroupId = useGroupTabs((state) => state.setSelectedGroupId);
  const setSearchTeam = useGroupTabs((state) => state.setSearchTeam);

  const setSelectedMatchDetails = useTournamentStore(
    (state) => state.setSelectedMatchDetails,
  );
  const setMatchDetailsDrawerOpen = useTournamentStore(
    (state) => state.setMatchDetailsDrawerOpen,
  );

  const [inputValue, setInputValue] = useState<string>(
    searchTeam !== false ? searchTeam : "",
  );

  // Debounce search team
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTeam !== false) {
        setSearchTeam(inputValue);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputValue, searchTeam, setSearchTeam]);

  const groups = useQuery(
    api.modules.tournaments.groups.get.getGroupsByTournamentCategory,
    {
      tournamentCategoryId,
    },
  );

  const matches = useQuery(
    api.modules.tournaments.groups.get.getGroupMatches,
    selectedGroupId
      ? {
          groupId: selectedGroupId,
          teamName:
            searchTeam !== false && searchTeam.length > 0
              ? searchTeam
              : undefined,
        }
      : "skip",
  );

  useEffect(() => {
    if (groups && groups.length > 0) {
      setSelectedGroupId(groups[0]._id);
    }
  }, [groups, setSelectedGroupId]);

  if (groups === undefined || selectedGroupId === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const now = Date.now();
  const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;

  const liveMatches = [...(matches ?? [])].filter(
    (match) => match.status === "in_progress",
  );

  const todayStr = new Date().toDateString();

  const todayMatches = [...(matches ?? [])].filter(
    (match) =>
      match.status !== "in_progress" &&
      match.scheduledAt &&
      new Date(match.scheduledAt).toDateString() === todayStr,
  );

  const allScheduledMatchesWithDate =
    matches?.filter(
      (match) => match.status === "scheduled" && !!match.scheduledAt,
    ) ?? [];

  let upcomingMatches = allScheduledMatchesWithDate.filter((match) => {
    const matchTime = new Date(match.scheduledAt as string).getTime();
    return (
      matchTime >= now &&
      matchTime <= threeDaysFromNow &&
      new Date(match.scheduledAt as string).toDateString() !== todayStr
    );
  });

  if (
    allScheduledMatchesWithDate.length === 1 &&
    new Date(
      allScheduledMatchesWithDate[0].scheduledAt as string,
    ).toDateString() !== todayStr
  ) {
    upcomingMatches = allScheduledMatchesWithDate;
  }

  const upcomingMatchIds = new Set(upcomingMatches.map((m) => m._id));
  const todayMatchIds = new Set(todayMatches.map((m) => m._id));

  const otherMatches =
    matches
      ?.filter(
        (match) =>
          match.status !== "in_progress" &&
          !upcomingMatchIds.has(match._id) &&
          !todayMatchIds.has(match._id),
      )
      .sort((a, b) => {
        // Sort by scheduledAt if available (newest first or oldest first)
        if (a.scheduledAt && b.scheduledAt) {
          return (
            new Date(b.scheduledAt).getTime() -
            new Date(a.scheduledAt).getTime()
          );
        }
        return 0;
      }) ?? [];

  const allMatchesScheduledWithoutDate =
    matches !== undefined &&
    matches.length > 0 &&
    matches.every(
      (match) => match.status === "scheduled" && !match.scheduledAt,
    );

  return (
    <div className="mb-4 space-y-3">
      <Tabs
        value={selectedGroupId}
        className="w-full bg-muted border rounded-xl overflow-clip gap-0"
      >
        <TabsList className="w-full border-none px-1 h-11">
          {groups?.map((group) => (
            <TabsTrigger
              key={group._id}
              value={group._id}
              className="rounded-lg"
              onClick={() => setSelectedGroupId(group._id)}
            >
              {group.name}
            </TabsTrigger>
          ))}
          <Button
            size="icon"
            variant={"ghost"}
            className="rounded-lg"
            onClick={() => setSearchTeam(searchTeam !== false ? false : "")}
          >
            <DynamicIcon
              name={searchTeam === false ? "search" : "chevron-up"}
              className="size-4"
            />
          </Button>
        </TabsList>
        {searchTeam !== false && (
          <div className="flex p-1">
            <Input
              placeholder="Cerca team..."
              className="w-full border-none rounded-none placeholder:text-muted-foreground focus-visible:ring-0"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Button
              variant={"ghost"}
              size={"icon"}
              onClick={() => setInputValue("")}
            >
              <Delete />
            </Button>
          </div>
        )}
      </Tabs>
    </div>
  );
}

export function GroupMatchesList({ tournamentCategoryId }: GroupTabsProps) {
  const selectedGroupId = useGroupTabs((state) => state.selectedGroupId);
  const searchTeam = useGroupTabs((state) => state.searchTeam);

  const setSelectedMatchDetails = useTournamentStore(
    (state) => state.setSelectedMatchDetails,
  );
  const setMatchDetailsDrawerOpen = useTournamentStore(
    (state) => state.setMatchDetailsDrawerOpen,
  );

  const groups = useQuery(
    api.modules.tournaments.groups.get.getGroupsByTournamentCategory,
    {
      tournamentCategoryId,
    },
  );

  const matches = useQuery(
    api.modules.tournaments.groups.get.getGroupMatches,
    selectedGroupId
      ? {
          groupId: selectedGroupId,
          teamName:
            searchTeam !== false && searchTeam.length > 0
              ? searchTeam
              : undefined,
        }
      : "skip",
  );

  if (groups === undefined || selectedGroupId === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const now = Date.now();
  const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;

  const liveMatches = [...(matches ?? [])].filter(
    (match) => match.status === "in_progress",
  );

  const todayStr = new Date().toDateString();

  const todayMatches = [...(matches ?? [])].filter(
    (match) =>
      match.status !== "in_progress" &&
      match.scheduledAt &&
      new Date(match.scheduledAt).toDateString() === todayStr,
  );

  const allScheduledMatchesWithDate =
    matches?.filter(
      (match) => match.status === "scheduled" && !!match.scheduledAt,
    ) ?? [];

  let upcomingMatches = allScheduledMatchesWithDate.filter((match) => {
    const matchTime = new Date(match.scheduledAt as string).getTime();
    return (
      matchTime >= now &&
      matchTime <= threeDaysFromNow &&
      new Date(match.scheduledAt as string).toDateString() !== todayStr
    );
  });

  if (
    allScheduledMatchesWithDate.length === 1 &&
    new Date(
      allScheduledMatchesWithDate[0].scheduledAt as string,
    ).toDateString() !== todayStr
  ) {
    upcomingMatches = allScheduledMatchesWithDate;
  }

  const upcomingMatchIds = new Set(upcomingMatches.map((m) => m._id));
  const todayMatchIds = new Set(todayMatches.map((m) => m._id));

  const otherMatches =
    matches
      ?.filter(
        (match) =>
          match.status !== "in_progress" &&
          !upcomingMatchIds.has(match._id) &&
          !todayMatchIds.has(match._id),
      )
      .sort((a, b) => {
        // Sort by scheduledAt if available (newest first or oldest first)
        if (a.scheduledAt && b.scheduledAt) {
          return (
            new Date(b.scheduledAt).getTime() -
            new Date(a.scheduledAt).getTime()
          );
        }
        return 0;
      }) ?? [];

  const allMatchesScheduledWithoutDate =
    matches !== undefined &&
    matches.length > 0 &&
    matches.every(
      (match) => match.status === "scheduled" && !match.scheduledAt,
    );

  return (
    <div className="mb-4 space-y-3">
      {matches && (
        <div className="flex flex-col gap-6">
          {searchTeam !== false &&
            !!searchTeam.length &&
            matches.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card">
                <Search className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {matches.length} risultati per "{searchTeam}"
                </span>
              </div>
            )}

          {liveMatches.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="px-1 text-sm font-bold text-destructive uppercase tracking-wide flex items-center gap-2">
                <LiveDot />
                Live Ora
              </h3>
              <div className="flex flex-col rounded-lg border-2 border-destructive/70 shadow-sm shadow-destructive/10 divide-y overflow-clip">
                {liveMatches.map((match) => (
                  <MatchCard
                    onClick={() => {
                      setSelectedMatchDetails(match);
                      setMatchDetailsDrawerOpen(true);
                    }}
                    key={match._id}
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
                ))}
              </div>
            </div>
          )}

          {todayMatches.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="px-1 text-sm font-medium text-foreground uppercase tracking-wide">
                Oggi
              </h3>
              <div className="flex flex-col rounded-lg border border-border divide-y overflow-clip">
                {todayMatches.map((match) => (
                  <MatchCard
                    onClick={() => {
                      setSelectedMatchDetails(match);
                      setMatchDetailsDrawerOpen(true);
                    }}
                    key={match._id}
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
                ))}
              </div>
            </div>
          )}

          {upcomingMatches.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="px-1 text-sm font-medium text-muted-foreground">
                Prossimamente
              </h3>
              <div className="flex flex-col rounded-lg border border-border divide-y overflow-clip">
                {upcomingMatches.map((match) => (
                  <MatchCard
                    onClick={() => {
                      setSelectedMatchDetails(match);
                      setMatchDetailsDrawerOpen(true);
                    }}
                    key={match._id}
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
                ))}
              </div>
            </div>
          )}

          {otherMatches.length > 0 && (
            <div
              className={
                allMatchesScheduledWithoutDate ? "" : "flex flex-col gap-2"
              }
            >
              {!allMatchesScheduledWithoutDate && (
                <h3 className="px-1 text-sm font-medium text-muted-foreground">
                  Altri match
                </h3>
              )}
              <div className="flex flex-col rounded-lg border border-border divide-y overflow-clip">
                {otherMatches.map((match) => (
                  <MatchCard
                    onClick={() => {
                      setSelectedMatchDetails(match);
                      setMatchDetailsDrawerOpen(true);
                    }}
                    key={match._id}
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
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!matches?.length && searchTeam !== false && (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <DynamicIcon
            name="search-slash"
            className="size-6 text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">Nessun team trovato</p>
        </div>
      )}
    </div>
  );
}
