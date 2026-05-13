import { Calendar, ClockFading, Play, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchCardSet {
  teamAGames: number;
  teamBGames: number;
}

interface MatchCardProps extends React.HTMLAttributes<HTMLDivElement> {
  teams: {
    name: string;
    players: string[];
  }[];

  points: MatchCardPointProps;
  sets: MatchCardSet[];

  status: "scheduled" | "in_progress" | "finished";
  date?: string;
}

const STATUS_DISPLAY = {
  scheduled: "Programmata",
  in_progress: "LIVE",
  finished: "Terminata",
};

export default function MatchCard({
  teams,
  status,
  points,
  sets,
  date,
  className,
  ...props
}: MatchCardProps) {
  return (
    <div className={cn("px-0 py-0 bg-muted", className)} {...props}>
      {/* <div className="border-b flex items-center px-3 py-3">
        <div className="flex-1 flex gap-1.5">
          <Badge className="bg-green-100 text-green-950">
            {status === "scheduled" && !date ? (
              <>
                <CalendarClock /> Da programmare
              </>
            ) : (
              STATUS_DISPLAY[status]
            )}
          </Badge>
          {date && (
            <div className="flex gap-1.5">
              <Badge variant={"outline"}>{date}</Badge>
            </div>
          )}
        </div>
      </div> */}
      <div className="flex gap-3 items-center py-3 px-4">
        <div className="flex flex-1 font-medium">
          <div className="flex flex-1 flex-col font-semibold gap-0.5 text-xs">
            <div>
              <p className="whitespace-nowrap">
                <span>{teams[0].players[0]}</span>
                <span className="text-muted-foreground font-medium"> / </span>
                <span>{teams[0].players[1]}</span>
              </p>
            </div>
            <div>
              <p className="whitespace-nowrap">
                <span>{teams[1].players[0]}</span>
                <span className="text-muted-foreground font-medium"> / </span>
                <span>{teams[1].players[1]}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          {status === "scheduled" ? (
            <MatchCardScheduled date={date} />
          ) : (
            <div className="flex items-center">
              {status === "in_progress" &&
                sets.map((set) => (
                  <MatchCardPoints
                    key={`${set.teamAGames}-${set.teamBGames}`}
                    teamAPoints={set.teamAGames}
                    teamBPoints={set.teamBGames}
                    status={status === "in_progress" ? "live" : "finished"}
                  />
                ))}
              {status === "finished" && (
                <MatchCardPoints
                  teamAPoints={points.teamAPoints}
                  teamBPoints={points.teamBPoints}
                  status="finished"
                />
              )}
              {status === "in_progress" && (
                <div
                  className={cn(
                    "h-full flex flex-col",
                    points.teamAPoints > points.teamBPoints
                      ? "justify-start"
                      : "justify-end",
                  )}
                >
                  <div className="grid place-content-center size-6">
                    <Play className="rotate-180 size-4" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* <div className="border-t flex items-center px-3 py-3">
          <div className="flex gap-2 flex-1">
            <Badge
              variant={"outline"}
              className="flex-1 h-9 divide-x p-0! gap-0 font-semibold"
            >
              <span className="h-full flex items-center bg-accent text-accent-foreground mr-1 px-2">
                SET 1
              </span>{" "}
              <span className="h-full flex flex-1 justify-center items-center px-2">
                3 - 2
              </span>
            </Badge>
            <Badge
              variant={"outline"}
              className="flex-1 h-9 divide-x p-0! gap-0 font-semibold"
            >
              <span className="h-full flex items-center bg-accent text-accent-foreground mr-1 px-2">
                SET 2
              </span>{" "}
              <span className="h-full flex flex-1 justify-center items-center px-2">
                3 - 2
              </span>
            </Badge>
            <Badge
              variant={"outline"}
              className="flex-1 h-9 divide-x p-0! gap-0 font-semibold"
            >
              <span className="h-full flex items-center bg-accent text-accent-foreground mr-1 px-2">
                SET 3
              </span>{" "}
              <span className="h-full flex flex-1 justify-center items-center px-2">
                3 - 2
              </span>
            </Badge>
          </div>
        </div> */}
    </div>
  );
}

interface MatchCardPointProps {
  teamAPoints: number;
  teamBPoints: number;
  status?: "live" | "finished";
}

const MatchCardPoints = ({
  teamAPoints,
  teamBPoints,
  status = "live",
}: MatchCardPointProps) => {
  return (
    <div className="flex flex-col w-6 font-semibold text-muted-foreground">
      <span
        className={cn(
          "relative min-w-6 w-full text-center",
          status === "live" && teamAPoints > teamBPoints && "text-foreground",
          status === "finished" &&
            teamAPoints >= teamBPoints &&
            "text-accent font-bold",
        )}
      >
        {teamAPoints}
        {status === "finished" && teamAPoints > teamBPoints && (
          <MatchCardTrophy />
        )}
      </span>
      <span
        className={cn(
          "relative min-w-6 w-full text-center",
          status === "live" && teamBPoints > teamAPoints && "text-foreground",
          status === "finished" &&
            teamBPoints >= teamAPoints &&
            "text-accent font-bold",
        )}
      >
        {teamBPoints}
        {status === "finished" && teamBPoints > teamAPoints && (
          <MatchCardTrophy />
        )}
      </span>
    </div>
  );
};

const MatchCardTrophy = () => {
  return (
    <div className="absolute -right-3 inset-y-0 -translate-y-1 rotate-4 grid place-content-center size-6">
      <Trophy className="size-3 text-amber-400" />
    </div>
  );
};

const MatchCardScheduled = ({ date }: { date?: string }) => {
  return (
    <div className="flex h-6 min-w-9 gap-2 px-1 w-max rounded-full ring-1 text-accent-foreground bg-accent ring-offset-2 ring-offset-muted ring-accent/20 justify-center items-center">
      <span className="font-medium text-xs">
        {date ? date : "Da programmare"}
      </span>
      {date ? (
        <Calendar className="size-4" />
      ) : (
        <ClockFading className="size-4" />
      )}
    </div>
  );
};
