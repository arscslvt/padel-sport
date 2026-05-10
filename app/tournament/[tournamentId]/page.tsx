"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { columns, type Round } from "./columns";
import { DataTable } from "./data-table";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarOff,
  Circle,
  CircleDashed,
  CircleDotDashed,
  Dot,
  Gamepad,
  Venus,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

async function getData(): Promise<Round[]> {
  // Fetch data from your API here.
  return [
    {
      id: "1",
      position: 1,
      team: "Michele / Salvatore",
      slot: "Campo 1",
      games: 5,
      pts: 10,
      victories: 3,
      defeats: 2,
      wins: 6,
      losses: 4,
    },
    {
      id: "2",
      position: 2,
      team: "Luca / Giovanni",
      games: 5,
      pts: 8,
      victories: 2,
      defeats: 3,
      wins: 5,
      losses: 5,
    },
    {
      id: "3",
      position: 3,
      team: "Martina / Francesca",
      games: 5,
      pts: 12,
      victories: 4,
      defeats: 1,
      wins: 7,
      losses: 3,
    },
    // ...
  ];
}

export default function TournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  const tournament = useQuery(api.modules.tournaments.get.bySlug, {
    slug: tournamentId,
  });

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

  return (
    <main className="px-4 lg:px-32">
      <div className="flex flex-col my-2">
        <h1 className="font-heading text-white text-xl font-bold">
          {tournament.name}
        </h1>
        <div className="flex gap-2 mt-4">
          <Badge variant={"secondary"}>
            <div className="inline-block bg-green-500 min-w-6 size-5 rounded-full" />{" "}
            Fase a Gironi
          </Badge>
          <Badge variant={"outline"}>3 Gruppi</Badge>
          <Badge variant={"outline"}>12 Squadre</Badge>
        </div>
      </div>

      <div className="sticky top-20 pb-4 z-30">
        <Tabs defaultValue="intermedio" className="w-full mt-6">
          <div className="bg-muted relative overflow-x-auto rounded-xl border">
            <TabsList className="bg-transparent w-max px-1 h-11 [&_data-[state=active]]:sticky [&_data-[state=active]]:left-0">
              <TabsTrigger value="intermedio" className="rounded-lg">
                <Circle />
                Intermedio
              </TabsTrigger>
              <TabsTrigger value="medio-avanzato" className="rounded-lg">
                <CircleDotDashed />
                Medio Avanzato
              </TabsTrigger>
              <TabsTrigger value="principiante" className="rounded-lg">
                <CircleDashed />
                Principiante
              </TabsTrigger>
              <TabsTrigger value="femminile" className="rounded-lg">
                <Venus />
                Femminile
              </TabsTrigger>
              <TabsTrigger value="under-18" className="rounded-lg">
                <Gamepad />
                UNDER-18
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      <div>
        <DataTable columns={columns} data={[]} />
      </div>

      <div className="mt-8">
        <div className="mb-4">
          <h3 className="font-medium uppercase font-heading italic">
            Partite giocate
          </h3>
          <p className="text-xs mt-1 text-muted-foreground">
            Ecco un riepilogo delle partite giocate finora, con i risultati e i
            dettagli di ogni incontro. Clicca su una partita per vedere
            ulteriori informazioni e statistiche.
          </p>
        </div>

        <div className="mb-4">
          <Tabs defaultValue="sub-girone-a" className="w-full">
            <TabsList className="w-full px-1 border h-11 rounded-xl">
              <TabsTrigger value="sub-girone-a" className="rounded-lg">
                A
              </TabsTrigger>
              <TabsTrigger value="sub-girone-b" className="rounded-lg">
                B
              </TabsTrigger>
              <TabsTrigger value="sub-girone-c" className="rounded-lg">
                C
              </TabsTrigger>
              <TabsTrigger value="sub-girone-d" className="rounded-lg">
                D
              </TabsTrigger>
              <TabsTrigger value="sub-girone-e" className="rounded-lg">
                E
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="py-0">
          <CardContent className="px-0 py-0">
            <div className="border-b flex items-center px-3 py-3">
              <div className="flex-1 flex gap-1.5">
                <Badge className="bg-green-100 text-green-950">FINITA</Badge>
                <div className="flex gap-1.5">
                  <Badge variant={"outline"}>16 Maggio</Badge>
                  <Badge variant={"outline"}>15:45</Badge>
                </div>
              </div>
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">
                  GIRONE 1
                </span>
              </div>
            </div>
            <div className="flex gap-3 items-center py-3 px-3">
              <div className="flex flex-1 font-medium">
                <div className="flex flex-1 flex-col italic items-center gap-0.5 font-heading text-sm">
                  <p className="-translate-x-3">Giovanni</p>
                  <p className="translate-x-3">Luca</p>
                </div>
              </div>
              <div className="flex-1 flex justify-center">
                <span className="flex h-9 w-max rounded-full px-1 ring-1 text-lg font-heading font-bold text-accent-foreground bg-accent ring-offset-2 ring-offset-card ring-accent/20">
                  <span className="flex-1 flex items-center justify-center min-w-10">
                    1
                  </span>
                  <span className="h-12 -rotate-8 w-px bg-accent-foreground" />
                  <span className="flex-1 flex items-center justify-center min-w-10">
                    1
                  </span>
                </span>
              </div>
              <div className="flex flex-1 font-medium">
                <div className="flex flex-1 flex-col italic items-center gap-0.5 font-heading text-sm">
                  <p className="-translate-x-3">Mario</p>
                  <p className="translate-x-3">Stefano</p>
                </div>
              </div>
            </div>
            <div className="border-t flex items-center px-3 py-3">
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
              <div></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
