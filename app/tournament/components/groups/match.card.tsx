import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, ClockFading } from "lucide-react";

interface MatchCardProps {
  teams: {
    name: string;
    players: string[];
  }[];

  points: MatchCardPointProps;

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
  date,
}: MatchCardProps) {
  return (
    <Card className="py-0">
      <CardContent className="px-0 py-0">
        <div className="border-b flex items-center px-3 py-3">
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
        </div>
        <div className="flex gap-3 items-center py-3 px-4">
          <div className="flex flex-1 font-medium">
            <div className="flex flex-1 flex-col font-semibold items-center gap-0.5 text-sm">
              <p className="whitespace-nowrap">{teams[0].players[0]}</p>
              <p className="whitespace-nowrap">{teams[0].players[1]}</p>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            {status === "scheduled" ? (
              <MatchCardScheduled />
            ) : (
              <MatchCardPoints
                teamAPoints={points.teamAPoints}
                teamBPoints={points.teamBPoints}
              />
            )}
          </div>
          <div className="flex flex-1 font-medium">
            <div className="flex flex-1 flex-col font-semibold items-center gap-0.5 text-sm">
              <p className="whitespace-nowrap">{teams[1].players[0]}</p>
              <p className="whitespace-nowrap">{teams[1].players[1]}</p>
            </div>
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
      </CardContent>
    </Card>
  );
}

interface MatchCardPointProps {
  teamAPoints: number;
  teamBPoints: number;
}

const MatchCardPoints = ({ teamAPoints, teamBPoints }: MatchCardPointProps) => {
  return (
    <span className="flex h-9 w-max rounded-full px-1 ring-1 text-lg font-heading font-bold text-accent-foreground bg-accent ring-offset-2 ring-offset-card ring-accent/20">
      <span className="flex-1 flex items-center justify-center min-w-10">
        {teamAPoints}
      </span>
      <span className="h-12 -rotate-8 w-px bg-accent-foreground" />
      <span className="flex-1 flex items-center justify-center min-w-10">
        {teamBPoints}
      </span>
    </span>
  );
};

const MatchCardScheduled = () => {
  return (
    <span className="flex h-9 min-w-9 w-max rounded-full px-1 ring-1 text-lg font-heading font-bold text-accent-foreground bg-accent ring-offset-2 ring-offset-card ring-accent/20 justify-center items-center">
      <ClockFading />
    </span>
  );
};
