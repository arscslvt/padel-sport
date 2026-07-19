"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, Save, Settings2, Shuffle, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@padel-sport/backend/convex/_generated/api";
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

type StageCandidateTeam = {
  id: string;
  team: string;
  slot?: string;
  position?: number;
};

type ManualPairing = {
  id: string;
  teamAId?: string;
  teamBId?: string;
};

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
  const previousStage =
    stage === "quarter" ? null : stage === "semi" ? "quarter" : "semi";
  const previousStageMatches = useQuery(
    api.modules.tournaments.matches.get.getMatchesByCategoryAndStage,
    previousStage ? { tournamentCategoryId, stage: previousStage } : "skip",
  );

  const saveSelection = useMutation(
    api.modules.tournaments.advancements.saveSelectionByCategoryStage,
  );

  const [mode, setMode] = useState<"smart" | "manual">("smart");
  const [draftSelection, setDraftSelection] = useState<string[]>([]);
  const [manualPairings, setManualPairings] = useState<ManualPairing[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!savedSelection) {
      setMode("smart");
      setDraftSelection([]);
      setManualPairings([]);
      return;
    }

    setMode(savedSelection.mode ?? "smart");
    setDraftSelection(
      (savedSelection.mode ?? "smart") === "smart"
        ? savedSelection.qualifiedTeamIds
        : [],
    );
    setManualPairings(
      (savedSelection.mode ?? "smart") === "manual"
        ? (savedSelection.manualPairings?.map((pairing, index) => ({
            id: `${pairing.teamAId}-${pairing.teamBId}-${index}`,
            teamAId: pairing.teamAId,
            teamBId: pairing.teamBId,
          })) ?? buildDefaultManualPairings(savedSelection.qualifiedTeamIds))
        : [],
    );
  }, [savedSelection]);

  const selectedTeamIds =
    mode === "manual"
      ? manualPairings.flatMap((pairing) =>
          [pairing.teamAId, pairing.teamBId].filter(
            (teamId): teamId is string => Boolean(teamId),
          ),
        )
      : draftSelection;

  const selectedTeamIdSet = useMemo(
    () => new Set(selectedTeamIds),
    [selectedTeamIds],
  );

  const candidateTeams = useMemo<StageCandidateTeam[]>(() => {
    if (!standings) return [];
    if (stage === "quarter") return standings;
    if (!previousStageMatches || previousStageMatches.length === 0) {
      return standings;
    }
    if (previousStageMatches.some((match) => match.status !== "finished")) {
      return [];
    }

    const winners: Array<StageCandidateTeam | null> = previousStageMatches
      .slice()
      .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
      .map((match, index) => {
        const winnerId =
          match.points.teamA > match.points.teamB
            ? match.tournamentTeamAId
            : match.points.teamB > match.points.teamA
              ? match.tournamentTeamBId
              : null;
        if (!winnerId) return null;

        const teamName =
          match.points.teamA > match.points.teamB
            ? match.teams[0]?.name
            : match.points.teamB > match.points.teamA
              ? match.teams[1]?.name
              : null;

        return {
          id: winnerId,
          team: teamName ?? "Squadra",
          slot: previousStage ?? undefined,
          position: index + 1,
        };
      });

    return winners.filter((team): team is StageCandidateTeam => team !== null);
  }, [previousStage, previousStageMatches, standings, stage]);

  const qualifiedTeams = (candidateTeams ?? []).filter((team) =>
    selectedTeamIdSet.has(team.id),
  );

  const requiredTeams = REQUIRED_TEAMS[stage];
  const pairCount = requiredTeams / 2;
  const manualSelectionComplete =
    manualPairings.length === pairCount &&
    manualPairings.every(
      (pairing) =>
        pairing.teamAId &&
        pairing.teamBId &&
        pairing.teamAId !== pairing.teamBId,
    ) &&
    selectedTeamIds.length === requiredTeams &&
    new Set(selectedTeamIds).size === requiredTeams;
  const smartSelectionComplete = draftSelection.length === requiredTeams;
  const isDirty =
    mode === "manual"
      ? JSON.stringify(manualPairings) !==
        JSON.stringify(savedSelection?.manualPairings ?? [])
      : JSON.stringify([...draftSelection].sort()) !==
        JSON.stringify(
          [...((savedSelection?.qualifiedTeamIds ?? []) as string[])].sort(),
        );
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

  const updateManualPairing = (
    index: number,
    slot: "teamAId" | "teamBId",
    value: string,
  ) => {
    setManualPairings((current) =>
      current.map((pairing, pairingIndex) =>
        pairingIndex === index
          ? {
              ...pairing,
              [slot]: value,
            }
          : pairing,
      ),
    );
  };

  const clearManualSelection = () => {
    setManualPairings(buildEmptyManualPairings(pairCount));
  };

  const autoArrangeManualSelection = () => {
    setManualPairings(
      buildPairingsFromTeams((candidateTeams ?? []).slice(0, requiredTeams)),
    );
  };

  useEffect(() => {
    if (mode !== "manual") return;
    if (manualPairings.length > 0) return;
    setManualPairings(buildEmptyManualPairings(pairCount));
  }, [mode, manualPairings.length, pairCount]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (mode === "manual") {
        const pairings = manualPairings
          .filter((pairing) => pairing.teamAId && pairing.teamBId)
          .map((pairing) => ({
            teamAId: pairing.teamAId as string,
            teamBId: pairing.teamBId as string,
          }));
        await saveSelection({
          tournamentCategoryId,
          stage,
          mode: "manual",
          qualifiedTeamIds: selectedTeamIds,
          manualPairings: pairings.map((pairing) => ({
            teamAId: pairing.teamAId,
            teamBId: pairing.teamBId,
          })),
        });
      } else {
        await saveSelection({
          tournamentCategoryId,
          stage,
          mode: "smart",
          qualifiedTeamIds: draftSelection,
        });
      }
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

  if (
    standings === undefined ||
    (previousStage && previousStageMatches === undefined)
  ) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border bg-background">
        <span className="text-sm text-muted-foreground">
          Caricamento fase...
        </span>
      </div>
    );
  }

  if (!editable) {
    return (
      <div className="space-y-4">
        <Card className="border-border/70 bg-card">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fase salvata
                </p>
                <CardTitle className="mt-1 text-lg">
                  {STAGE_LABELS[stage]}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {savedSelection?.mode === "manual"
                    ? "Questa fase usa accoppiamenti manuali."
                    : "Questa fase usa il seeding automatico."}
                </p>
              </div>
              <Badge
                variant={
                  qualifiedTeams.length === REQUIRED_TEAMS[stage]
                    ? "secondary"
                    : "outline"
                }
                className="w-fit px-3 py-1.5"
              >
                <UsersRound className="size-3.5" /> {qualifiedTeams.length}/
                {REQUIRED_TEAMS[stage]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid gap-2 md:grid-cols-2">
              {qualifiedTeams.map((team) => (
                <div key={team.id} className="rounded-lg border px-3 py-2">
                  <p className="font-medium">{team.team}</p>
                  <p className="text-xs text-muted-foreground">
                    {team.slot ?? "-"} · #{team.position ?? "-"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 2xl:grid 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] 2xl:items-start 2xl:gap-5 2xl:space-y-0">
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as "smart" | "manual")}
      >
        <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 border bg-background/90 p-1.5 shadow-sm backdrop-blur-xl">
          <TabsTrigger value="smart" className="gap-2 px-3 py-2.5">
            <Settings2 className="size-4" />
            <span className="text-left">
              <span className="block">Smart</span>
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                Seeding automatico
              </span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2 px-3 py-2.5">
            <Shuffle className="size-4" />
            <span className="text-left">
              <span className="block">Manuale</span>
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                Coppie scelte a mano
              </span>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smart" className="space-y-4 outline-none">
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
                    selectedTeamIds.length === REQUIRED_TEAMS[stage]
                      ? "secondary"
                      : "destructive"
                  }
                  className="w-fit px-3 py-1.5"
                >
                  <UsersRound className="size-3.5" /> {selectedTeamIds.length}/
                  {REQUIRED_TEAMS[stage]}
                </Badge>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (selectedTeamIds.length / REQUIRED_TEAMS[stage]) * 100)}%`,
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-5">
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
                      candidateTeams
                        .slice(0, REQUIRED_TEAMS[stage])
                        .map((team) => team.id),
                    )
                  }
                >
                  Seleziona le prime {REQUIRED_TEAMS[stage]}
                </Button>
              </div>
              {(candidateTeams ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  Nessuna squadra disponibile per questa fase.
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {(candidateTeams ?? []).map((team) => {
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
                                `#${team.position ?? "-"}`
                              )}
                            </span>
                          </div>
                          <span className="text-xs opacity-80">
                            {team.slot ?? "-"} • {team.position ?? "-"}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide opacity-70">
                            {selected ? "Selezionata" : "Tocca per selezionare"}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}

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
                  disabled={!smartSelectionComplete || !isDirty || isSaving}
                >
                  <Save className="size-4" />
                  {isSaving
                    ? "Salvataggio..."
                    : isDirty
                      ? "Salva selezione"
                      : "Selezione salvata"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 outline-none">
          <Card className="border-border/70 bg-card">
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    2. Pairing manuale
                  </p>
                  <CardTitle className="mt-1 text-lg">
                    {STAGE_LABELS[stage]}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Scegli le squadre che avanzano e abbinale in ogni match.
                  </p>
                </div>
                <Badge
                  variant={
                    manualSelectionComplete ? "secondary" : "destructive"
                  }
                  className="w-fit px-3 py-1.5"
                >
                  <Shuffle className="size-3.5" /> {selectedTeamIds.length}/
                  {REQUIRED_TEAMS[stage]}
                </Badge>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (selectedTeamIds.length / REQUIRED_TEAMS[stage]) * 100)}%`,
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {previousStage &&
                previousStageMatches &&
                previousStageMatches.some(
                  (match) => match.status !== "finished",
                ) && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                    Completa prima il turno precedente: i match manuali usano i
                    vincitori di quella fase.
                  </div>
                )}

              {(!previousStageMatches || previousStageMatches.length === 0) &&
                stage !== "quarter" && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-700 dark:text-blue-300">
                    Nessun turno precedente trovato: puoi iniziare direttamente
                    da {STAGE_LABELS[stage].toLowerCase()} e scegliere le
                    squadre dalla classifica.
                  </div>
                )}

              {(candidateTeams ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  Nessuna squadra disponibile per il pairing manuale.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Ogni squadra può comparire una sola volta.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={autoArrangeManualSelection}
                      >
                        Disposizione automatica
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setManualPairings(buildDefaultManualPairings([]))
                        }
                      >
                        Svuota
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {manualPairings.map((pairing, index) => (
                      <div
                        key={pairing.id}
                        className="rounded-xl border border-border/70 bg-background p-3"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold">
                            Match {index + 1}
                          </p>
                          <Badge variant="outline">
                            {pairing.teamAId && pairing.teamBId
                              ? "Completo"
                              : "Da completare"}
                          </Badge>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <TeamSelect
                            label="Squadra A"
                            value={pairing.teamAId}
                            options={getAvailableTeamsForPairing(
                              candidateTeams ?? [],
                              manualPairings,
                              index,
                              "teamAId",
                            )}
                            onChange={(value) =>
                              updateManualPairing(index, "teamAId", value)
                            }
                          />
                          <TeamSelect
                            label="Squadra B"
                            value={pairing.teamBId}
                            options={getAvailableTeamsForPairing(
                              candidateTeams ?? [],
                              manualPairings,
                              index,
                              "teamBId",
                            )}
                            onChange={(value) =>
                              updateManualPairing(index, "teamBId", value)
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={clearManualSelection}
                    >
                      Azzera
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={!manualSelectionComplete || isSaving}
                    >
                      <Save className="size-4" />
                      {isSaving ? "Salvataggio..." : "Salva coppie"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

function TeamSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: StageCandidateTeam[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Seleziona squadra" />
        </SelectTrigger>
        <SelectContent>
          {options.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.team}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function getAvailableTeamsForPairing(
  teams: StageCandidateTeam[],
  pairings: ManualPairing[],
  currentIndex: number,
  slot: "teamAId" | "teamBId",
) {
  const currentValue = pairings[currentIndex]?.[slot];
  const usedTeamIds = new Set<string>();

  pairings.forEach((pairing, index) => {
    if (index === currentIndex) return;
    if (pairing.teamAId) usedTeamIds.add(pairing.teamAId);
    if (pairing.teamBId) usedTeamIds.add(pairing.teamBId);
  });

  return teams.filter(
    (team) => team.id === currentValue || !usedTeamIds.has(team.id),
  );
}

function buildDefaultManualPairings(teamIds: string[]) {
  const pairings: ManualPairing[] = [];
  for (let index = 0; index < teamIds.length; index += 2) {
    pairings.push({
      id: `${teamIds[index] ?? "pairing"}-${teamIds[index + 1] ?? "pairing"}-${index}`,
      teamAId: teamIds[index],
      teamBId: teamIds[index + 1],
    });
  }
  return pairings;
}

function buildPairingsFromTeams(teams: StageCandidateTeam[]) {
  return buildDefaultManualPairings(teams.map((team) => team.id));
}

function buildEmptyManualPairings(pairCount: number): ManualPairing[] {
  return Array.from({ length: pairCount }, (_, index) => ({
    id: `manual-pairing-${index}-${crypto.randomUUID()}`,
  }));
}
