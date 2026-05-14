"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { columns, type Round } from "./columns";
import { DataTable } from "./data-table";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarOff, ChevronRight } from "lucide-react";
import { DynamicIcon, IconName } from "lucide-react/dynamic";
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
import { Button } from "@/components/ui/button";
import GroupTabs from "../components/groups/groups.tabs";
import { useTournamentStore } from "../stores/tournament.store";
import { useEffect } from "react";
import type { Doc } from "@/convex/components/tournaments/_generated/dataModel";
import LiveDot from "../components/live-dot";
import TeamsListDrawer from "../components/teams/teams-list.drawer";

const CATEGORY_STATUS_DISPLAY: {
  [key in Doc<"tournamentCategories">["currentStage"]]: string;
} = {
  group: "Fase a gironi",
  quarter: "Quarti di finale",
  semi: "Semifinali",
  final: "Finale",
  completed: "Completata",
};

export default function TournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  const setTournamentId = useTournamentStore((state) => state.setTournamentId);
  const setSelectedCategoryId = useTournamentStore(
    (state) => state.setSelectedCategoryId,
  );
  const setTeamsDrawerOpen = useTournamentStore(
    (state) => state.setTeamsDrawerOpen,
  );

  const selectedCategoryId = useTournamentStore(
    (state) => state.selectedCategoryId,
  );

  const teamsDrawerOpen = useTournamentStore((state) => state.teamsDrawerOpen);

  const tournament = useQuery(api.modules.tournaments.get.bySlug, {
    slug: tournamentId,
  });

  const categories = useQuery(
    api.modules.tournaments.categories.get.byTournamentId,
    tournament?._id ? { tournamentId: tournament._id } : "skip",
  );

  useEffect(() => {
    if (tournament?._id) {
      setTournamentId(tournament._id);
    }
  }, [tournament?._id, setTournamentId]);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setSelectedCategoryId(categories[0]._id);
    }
  }, [categories, setSelectedCategoryId]);

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
    <main className="px-3 lg:px-32">
      <div className="flex flex-col mb-2">
        <h1 className="font-heading text-white text-xl font-bold">
          {tournament.name}
        </h1>
      </div>

      <div className="space-y-3 my-4">
        <div className="sticky top-20 z-30 border rounded-xl overflow-clip divide-y">
          <Tabs defaultValue="intermedio" className="w-full">
            <div className="bg-muted relative overflow-x-auto">
              <TabsList className="bg-transparent w-max px-1 h-11 [&_data-[state=active]]:sticky [&_data-[state=active]]:left-0">
                {categories?.map((category) => (
                  <TabsTrigger
                    key={category.slug}
                    value={category.slug}
                    className="rounded-t-lg first:rounded-bl-sm last:rounded-br-sm"
                    onClick={() => setSelectedCategoryId(category._id)}
                  >
                    {category?.icon && (
                      <DynamicIcon name={category.icon as IconName} />
                    )}
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
          <div className="flex divide-x">
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
      </div>

      <div>
        <DataTable columns={columns} data={[]} />
      </div>

      <div className="mt-8">
        <div className="mb-4">
          <h3 className="font-medium font-heading">Match della categoria</h3>
          <p className="text-sm mt-1 text-muted-foreground">
            Qui puoi vedere i match della categoria selezionata. Clicca su una
            partita per vedere i dettagli e inserire i risultati.
          </p>
        </div>

        {selectedCategoryId && (
          <div className="mb-4">
            <GroupTabs tournamentCategoryId={selectedCategoryId} />
          </div>
        )}
      </div>
    </main>
  );
}
