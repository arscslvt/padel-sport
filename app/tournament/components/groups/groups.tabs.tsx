import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MatchCard from "./match.card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { ChevronUp, Delete, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { create } from "zustand";
import { DynamicIcon } from "lucide-react/dynamic";

interface GroupTabsProps {
  tournamentCategoryId: string;
}

function toSurnameInitial(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const surname = parts[parts.length - 1];
  const initial = parts[0]?.charAt(0).toUpperCase();

  return initial ? `${surname} ${initial}.` : surname;
}

interface GroupTabsState {
  selectedGroupId: string | null;
  searchTeam: string | false;

  setSelectedGroupId: (groupId: string | null) => void;
  setSearchTeam: (search: string | false) => void;
}

const useGroupTabs = create<GroupTabsState>((set) => ({
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

      {matches && (
        <div className="flex flex-col rounded-lg border border-border divide-y overflow-clip">
          {searchTeam !== false &&
            !!searchTeam.length &&
            matches.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2">
                <Search className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {matches.length} risultati per "{searchTeam}"
                </span>
              </div>
            )}
          {matches.map((match) => (
            <MatchCard
              key={match._id}
              teams={match.teams.map((team) => ({
                name: team.name,
                players: team.players.map((player) =>
                  toSurnameInitial(player.name),
                ),
              }))}
              points={{
                teamAPoints: match.points.teamA,
                teamBPoints: match.points.teamB,
              }}
              status={match.status}
              date={
                match.scheduledAt
                  ? new Date(match.scheduledAt).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                    })
                  : undefined
              }
            />
          ))}
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
