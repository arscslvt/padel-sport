"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, Save, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { columns } from "../[tournamentId]/columns";
import { DataTable } from "../[tournamentId]/data-table";

type KnockoutStage = "quarter" | "semi" | "final";

const STAGE_LABELS: Record<KnockoutStage, string> = {
  quarter: "Quarti di finale",
  semi: "Semifinali",
  final: "Finale",
};

const REQUIRED_TEAMS: Record<KnockoutStage, number> = {
  quarter: 8,
  semi: 4,
  final: 2,
};

interface StageAdvancementPanelProps {
  tournamentCategoryId: string;
  stage: KnockoutStage;
  editable?: boolean;
}

export default function StageAdvancementPanel({
  tournamentCategoryId,
  stage,
  editable = false,
}: StageAdvancementPanelProps) {
  const standings = useQuery(
    api.modules.tournaments.advancements.getCategoryStandings,
    { tournamentCategoryId },
  );

  const savedSelection = useQuery(
    api.modules.tournaments.advancements.getSelectionByCategoryStage,
    { tournamentCategoryId, stage },
  );

  const saveSelection = useMutation(
    api.modules.tournaments.advancements.saveSelectionByCategoryStage,
  );

  const [draftSelection, setDraftSelection] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftSelection(savedSelection?.qualifiedTeamIds ?? []);
  }, [savedSelection]);

  const selectedTeamIds = editable
    ? draftSelection
    : (savedSelection?.qualifiedTeamIds ?? []);

  const selectedTeamIdSet = useMemo(
    () => new Set(selectedTeamIds),
    [selectedTeamIds],
  );

  const qualifiedTeams = (standings ?? []).filter((team) =>
    selectedTeamIdSet.has(team.id),
  );
  const savedIds = savedSelection?.qualifiedTeamIds ?? [];
  const isDirty =
    [...draftSelection].sort().join("|") !== [...savedIds].sort().join("|");

  const toggleTeam = (teamId: string) => {
    setDraftSelection((current) => {
      if (current.includes(teamId)) {
        return current.filter((id) => id !== teamId);
      }
      if (current.length >= REQUIRED_TEAMS[stage]) {
        toast.error(`Puoi selezionare ${REQUIRED_TEAMS[stage]} squadre.`);
        return current;
      }
      return [...current, teamId];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSelection({
        tournamentCategoryId,
        stage,
        qualifiedTeamIds: draftSelection,
      });
      toast.success("Qualificati salvati con successo");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossibile salvare i qualificati",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (standings === undefined) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border bg-background">
        <span className="text-sm text-muted-foreground">
          Caricamento fase...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5 2xl:grid 2xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)] 2xl:items-start 2xl:gap-5 2xl:space-y-0">
      <Card className="border-border/70 bg-card">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Selezione qualificate
              </p>
              <CardTitle className="mt-1 text-lg">
                {STAGE_LABELS[stage]}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Scegli {REQUIRED_TEAMS[stage]} squadre. L’ordine degli
                accoppiamenti seguirà la classifica.
              </p>
            </div>
            <Badge
              variant={
                qualifiedTeams.length === REQUIRED_TEAMS[stage]
                  ? "secondary"
                  : "destructive"
              }
              className="w-fit px-3 py-1.5"
            >
              <UsersRound className="size-3.5" /> {qualifiedTeams.length}/
              {REQUIRED_TEAMS[stage]}
            </Badge>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, (qualifiedTeams.length / REQUIRED_TEAMS[stage]) * 100)}%`,
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {editable ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Tocca una squadra per includerla o rimuoverla.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraftSelection(
                      standings
                        .slice(0, REQUIRED_TEAMS[stage])
                        .map((team) => team.id),
                    )
                  }
                >
                  Seleziona le prime {REQUIRED_TEAMS[stage]}
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {standings.map((team) => {
                  const selected = selectedTeamIdSet.has(team.id);

                  return (
                    <Button
                      key={team.id}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      className="h-auto min-h-20 items-start justify-start px-3 py-3 text-left"
                      onClick={() => toggleTeam(team.id)}
                    >
                      <div className="flex w-full flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{team.team}</span>
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background/20 text-xs">
                            {selected ? (
                              <Check className="size-3.5" />
                            ) : (
                              `#${team.position}`
                            )}
                          </span>
                        </div>
                        <span className="text-xs opacity-80">
                          {team.slot ?? "-"} • {team.pts} pts • DG {team.dg}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide opacity-70">
                          {selected ? "Selezionata" : "Tocca per selezionare"}
                        </span>
                      </div>
                    </Button>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDraftSelection([])}
                >
                  Azzera
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    draftSelection.length !== REQUIRED_TEAMS[stage] ||
                    !isDirty ||
                    isSaving
                  }
                >
                  <Save className="size-4" />
                  {isSaving
                    ? "Salvataggio..."
                    : isDirty
                      ? "Salva selezione"
                      : "Selezione salvata"}
                </Button>
              </div>
            </>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {qualifiedTeams.map((team) => (
                <div key={team.id} className="rounded-lg border px-3 py-2">
                  <p className="font-medium">{team.team}</p>
                  <p className="text-xs text-muted-foreground">
                    {team.slot ?? "-"} · {team.pts} pts
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Classifica di riferimento</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ordinata per punti, differenza game e vittorie.
          </p>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={standings} />
        </CardContent>
      </Card>
    </div>
  );
}
