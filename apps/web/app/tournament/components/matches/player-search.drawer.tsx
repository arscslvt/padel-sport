import { useQuery } from "convex/react";
import { differenceInDays, format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import {
  ChevronRight,
  ClockFading,
  Delete,
  Play,
  Search,
  Trophy,
} from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerHeader,
} from "@/components/ui/responsive-drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import {
  type SelectedMatchDetails,
  useTournamentStore,
} from "../../stores/tournament.store";

function formatPlayerName(firstName: string | undefined, lastName: string) {
  if (!firstName) return lastName;
  const initial = firstName.charAt(0).toUpperCase();
  return `${lastName} ${initial}.`;
}

export default function PlayerSearchDrawer() {
  const searchPlayer = useTournamentStore((state) => state.searchPlayer);
  const setSearchPlayer = useTournamentStore((state) => state.setSearchPlayer);
  const setSelectedMatchDetails = useTournamentStore(
    (state) => state.setSelectedMatchDetails,
  );
  const setMatchDetailsDrawerOpen = useTournamentStore(
    (state) => state.setMatchDetailsDrawerOpen,
  );

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
      <ResponsiveDrawerContent className="h-[85vh] sm:h-[80vh] flex flex-col p-0 bg-background overflow-clip gap-0">
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
                className="w-full pl-9 pr-10 bg-muted/50 border-input placeholder:text-muted-foreground"
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

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3 pb-8">
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
              <div className="flex flex-col rounded-lg divide-y overflow-clip">
                {matches.map((match) => (
                  <MatchCard
                    key={match._id}
                    match={match as SelectedMatchDetails}
                    onClick={() => {
                      setSelectedMatchDetails(match as SelectedMatchDetails);
                      setMatchDetailsDrawerOpen(true);
                      // opzionale: setSearchPlayer(false);
                    }}
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

interface MatchCardProps {
  match: SelectedMatchDetails;
  onClick: () => void;
}

const MatchCard = ({ match, onClick }: MatchCardProps) => {
  const _date = match.scheduledAt
    ? differenceInDays(new Date(match.scheduledAt), new Date()) === 0
      ? formatDistanceToNow(new Date(match.scheduledAt), {
          addSuffix: true,
          locale: it,
        })
      : format(new Date(match.scheduledAt), "d MMMM, HH:mm", { locale: it })
    : null;

  const teamA = match.teams[0];
  const teamB = match.teams[1];

  const teamAName = `${formatPlayerName(teamA.players[0]?.firstName, teamA.players[0]?.lastName)} / ${formatPlayerName(teamA.players[1]?.firstName, teamA.players[1]?.lastName)}`;
  const teamBName = `${formatPlayerName(teamB.players[0]?.firstName, teamB.players[0]?.lastName)} / ${formatPlayerName(teamB.players[1]?.firstName, teamB.players[1]?.lastName)}`;

  const isLive = match.status === "in_progress";
  const isFinished = match.status === "finished";

  return (
    <button
      className="flex gap-4 px-4 py-4 items-center text-left hover:bg-muted/50 transition-colors"
      type="button"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {match.categoryName && <span>{match.categoryName}</span>}
            {match.categoryName && match.groupName && <span>•</span>}
            {match.groupName && <span>{match.groupName}</span>}
          </div>

          <div className="shrink-0 ml-2">
            {isLive && (
              <Badge
                variant="destructive"
                className="py-0 px-1.5 min-h-5 text-[10px] animate-pulse shadow-sm shadow-destructive/20 gap-1"
              >
                <Play className="size-2.5 fill-current" /> Live
              </Badge>
            )}
            {isFinished && (
              <Badge
                variant="outline"
                className="py-0 px-1.5 min-h-5 text-[10px] bg-accent/10 border-accent text-accent font-semibold"
              >
                Terminata
              </Badge>
            )}
            {match.status === "scheduled" && (
              <Badge
                variant="secondary"
                className="py-0 px-1.5 min-h-5 text-[10px]"
              >
                In programma
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 px-0.5">
          <div className="flex justify-between items-center gap-2">
            <span
              className={`text-sm font-medium line-clamp-1 ${
                isFinished && match.points?.teamB > match.points?.teamA
                  ? "text-muted-foreground"
                  : ""
              }`}
            >
              {teamAName}
            </span>
            {isFinished && match.points?.teamA > match.points?.teamB && (
              <Trophy className="size-3.5 text-amber-400 shrink-0" />
            )}
          </div>
          <div className="flex justify-between items-center gap-2">
            <span
              className={`text-sm font-medium line-clamp-1 ${
                isFinished && match.points?.teamA > match.points?.teamB
                  ? "text-muted-foreground"
                  : ""
              }`}
            >
              {teamBName}
            </span>
            {isFinished && match.points?.teamB > match.points?.teamA && (
              <Trophy className="size-3.5 text-amber-400 shrink-0" />
            )}
          </div>
        </div>

        {_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClockFading className="size-3.5" /> {_date}
          </div>
        )}
      </div>

      <div className="shrink-0">
        <ChevronRight className="size-5 text-muted-foreground" />
      </div>
    </button>
  );
};
