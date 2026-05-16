import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerHeader,
} from "@/components/ui/responsive-drawer";
import { useTournamentStore } from "../../stores/tournament.store";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import MatchCard from "../groups/match.card";
import { DynamicIcon } from "lucide-react/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Delete, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";

function toSurnameInitial(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const surname = parts[parts.length - 1];
  const initial = parts[0]?.charAt(0).toUpperCase();
  return initial ? `${surname} ${initial}.` : surname;
}

export default function PlayerSearchDrawer() {
  const searchPlayer = useTournamentStore((state) => state.searchPlayer);
  const setSearchPlayer = useTournamentStore((state) => state.setSearchPlayer);

  const [inputValue, setInputValue] = useState<string>("");

  useEffect(() => {
    if (searchPlayer !== false) {
      setInputValue(searchPlayer);
    }
  }, [searchPlayer]);

  // Use debounce local to inputValue
  const [debouncedValue, setDebouncedValue] = useState(inputValue);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  const matches = useQuery(
    api.modules.tournaments.matches.get.getMatchByPlayerName,
    debouncedValue.trim().length > 0 ? { playerName: debouncedValue } : "skip",
  );

  return (
    <ResponsiveDrawer
      open={searchPlayer !== false}
      setOpen={(open) => setSearchPlayer(open ? inputValue : false)}
    >
      <ResponsiveDrawerContent className="h-[85vh] sm:h-[80vh] flex flex-col p-0 bg-background overflow-clip">
        <div className="px-4 py-2 border-b">
          <ResponsiveDrawerHeader
            title="Cerca Match"
            description="Cerca una partita tramite il nome dei giocatori"
            visuallyHidden
          />
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cerca giocatore o team..."
                className="w-full pl-9 pr-10 bg-muted/50 border-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
              />
              {inputValue.length > 0 && (
                <Button
                  variant={"ghost"}
                  size={"icon"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setInputValue("")}
                >
                  <Delete className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 overflow-y-auto">
          <div className="flex flex-col gap-3 pb-8 pt-2">
            {debouncedValue.trim().length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
                <Search className="size-10" />
                <p className="text-sm font-medium">
                  Inizia a digitare per cercare
                </p>
              </div>
            ) : matches === undefined ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Spinner />
                <p className="text-sm text-muted-foreground">
                  Ricerca in corso...
                </p>
              </div>
            ) : matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
                <DynamicIcon name="search-slash" className="size-10" />
                <p className="text-sm font-medium">Nessun match trovato</p>
              </div>
            ) : (
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
                    sets={match.sets.map((set) => ({
                      teamAGames: set.teamAPoints,
                      teamBGames: set.teamBPoints,
                    }))}
                    status={match.status}
                    date={match.scheduledAt ?? undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}
