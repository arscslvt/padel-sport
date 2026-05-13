import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MatchCard from "./match.card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";

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

export default function GroupTabs({ tournamentCategoryId }: GroupTabsProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const groups = useQuery(
    api.modules.tournaments.groups.get.getGroupsByTournamentCategory,
    {
      tournamentCategoryId,
    },
  );

  const matches = useQuery(
    api.modules.tournaments.groups.get.getGroupMatches,
    selectedGroupId ? { groupId: selectedGroupId } : "skip",
  );

  useEffect(() => {
    if (groups && groups.length > 0) {
      setSelectedGroupId(groups[0]._id);
    }
  }, [groups]);

  if (groups === undefined || selectedGroupId === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3">
      <Tabs value={selectedGroupId} className="w-full">
        <TabsList className="w-full px-1 border h-11 rounded-xl">
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
        </TabsList>
      </Tabs>

      {matches && (
        <div className="flex flex-col rounded-lg border border-border divide-y overflow-clip">
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
    </div>
  );
}
