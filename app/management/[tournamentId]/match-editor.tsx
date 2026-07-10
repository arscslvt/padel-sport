"use client";

import { useMutation } from "convex/react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Minus,
  MinusCircle,
  Plus,
  Radio,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";

export type MatchEditorMatch = {
  _id: string;
  status: "scheduled" | "in_progress" | "finished";
  stage?: "group" | "round16" | "quarter" | "semi" | "final";
  scheduledAt?: string;
  sets: Array<{ teamAPoints: number; teamBPoints: number }>;
  teams: Array<{ name: string }>;
  categoryName?: string;
  groupName?: string;
};

export default function MatchEditor({ match }: { match: MatchEditorMatch }) {
  const editMatch = useMutation(api.modules.tournaments.matches.edit.editMatch);

  const [status, setStatus] = useState<"scheduled" | "live" | "completed">(
    match.status === "in_progress"
      ? "live"
      : match.status === "finished"
        ? "completed"
        : match.status,
  );
  const [dateStart, setDateStart] = useState(
    match.scheduledAt
      ? format(new Date(match.scheduledAt), "yyyy-MM-dd'T'HH:mm")
      : null,
  );
  const [sets, setSets] = useState<
    { teamAPoints: number; teamBPoints: number; _key: string }[]
  >(() =>
    (match.sets || []).map(
      (s: { teamAPoints: number; teamBPoints: number }) => ({
        teamAPoints: s.teamAPoints,
        teamBPoints: s.teamBPoints,
        _key: createKey(),
      }),
    ),
  );

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const getTeamName = (teamIndex: number) => {
    return match.teams[teamIndex]?.name || `Team ${teamIndex + 1}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await editMatch({
        matchId: match._id,
        status,
        dateStart: dateStart ? new Date(dateStart).toISOString() : null,
        sets: sets.map(({ teamAPoints, teamBPoints }) => ({
          teamAPoints,
          teamBPoints,
        })),
      });
      setIsEditing(false);
      toast.success("Match aggiornato");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore salvataggio match",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setStatus(
      match.status === "in_progress"
        ? "live"
        : match.status === "finished"
          ? "completed"
          : "scheduled",
    );
    setDateStart(
      match.scheduledAt
        ? format(new Date(match.scheduledAt), "yyyy-MM-dd'T'HH:mm")
        : null,
    );
    setSets(
      match.sets.map((set) => ({
        ...set,
        _key: createKey(),
      })),
    );
    setIsEditing(false);
  };

  const handleSetChange = (index: number, team: "A" | "B", value: string) => {
    const newSets = [...sets];
    const parsed = Math.max(0, parseInt(value, 10) || 0);
    if (team === "A") {
      newSets[index].teamAPoints = parsed;
    } else {
      newSets[index].teamBPoints = parsed;
    }
    setSets(newSets);
  };

  const adjustSet = (index: number, team: "A" | "B", delta: number) => {
    const newSets = [...sets];
    if (team === "A") {
      newSets[index].teamAPoints = Math.max(
        0,
        newSets[index].teamAPoints + delta,
      );
    } else {
      newSets[index].teamBPoints = Math.max(
        0,
        newSets[index].teamBPoints + delta,
      );
    }
    setSets(newSets);
  };

  const addSet = () => {
    setSets([...sets, { teamAPoints: 0, teamBPoints: 0, _key: createKey() }]);
  };

  const removeSet = (index: number) => {
    setSets(sets.filter((_, i) => i !== index));
  };

  if (!isEditing) {
    const stageLabel = {
      group: match.groupName ?? "Girone",
      round16: "Ottavi",
      quarter: "Quarti",
      semi: "Semifinale",
      final: "Finale",
    }[match.stage ?? "group"];
    const setsA = match.sets.filter(
      (set) => set.teamAPoints > set.teamBPoints,
    ).length;
    const setsB = match.sets.filter(
      (set) => set.teamBPoints > set.teamAPoints,
    ).length;
    const statusConfig = {
      scheduled: {
        label: "Da giocare",
        icon: CalendarClock,
        className: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      },
      in_progress: {
        label: "Live",
        icon: Radio,
        className: "text-red-500 border-red-500/30 bg-red-500/10",
      },
      finished: {
        label: "Completata",
        icon: CheckCircle2,
        className: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
      },
    }[match.status];
    const StatusIcon = statusConfig.icon;

    return (
      <Card
        className={`overflow-hidden border-border/70 py-0 transition-colors hover:border-border ${
          match.status === "in_progress" ? "ring-1 ring-red-500/30" : ""
        }`}
      >
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={statusConfig.className}>
                  <StatusIcon className="size-3" /> {statusConfig.label}
                </Badge>
                <Badge variant="secondary">{match.categoryName}</Badge>
                <span className="text-xs font-medium text-muted-foreground">
                  {stageLabel}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2">
                <p className="truncate font-semibold">{getTeamName(0)}</p>
                <span className="grid size-8 place-content-center rounded-lg bg-muted text-lg font-bold">
                  {setsA}
                </span>
                <p className="truncate font-semibold">{getTeamName(1)}</p>
                <span className="grid size-8 place-content-center rounded-lg bg-muted text-lg font-bold">
                  {setsB}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" />
                  {match.scheduledAt
                    ? format(new Date(match.scheduledAt), "dd MMM · HH:mm", {
                        locale: it,
                      })
                    : "Orario da definire"}
                </span>
                {match.sets.length > 0 && (
                  <span>{match.sets.length} set registrati</span>
                )}
              </div>
            </div>
            <Button
              variant={match.status === "in_progress" ? "default" : "outline"}
              className="w-full justify-between lg:w-auto"
              onClick={() => setIsEditing(true)}
            >
              {match.status === "finished" ? "Correggi" : "Gestisci"}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/40 bg-card shadow-lg ring-1 ring-primary/15">
      <CardHeader className="border-b px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{match.categoryName}</Badge>
          <Badge variant="outline">{match.groupName ?? match.stage}</Badge>
        </div>
        <CardTitle className="mt-2 text-lg">Aggiorna risultato</CardTitle>
        <p className="text-sm text-muted-foreground">
          {getTeamName(0)} <span className="mx-1 opacity-50">vs</span>{" "}
          {getTeamName(1)}
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Stato Match</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as "scheduled" | "live" | "completed")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Programmato</SelectItem>
                <SelectItem value="live">In corso</SelectItem>
                <SelectItem value="completed">Completato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data e Ora</Label>
            <div className="flex items-center gap-2">
              <Input
                type="datetime-local"
                value={dateStart || ""}
                onChange={(e) => setDateStart(e.target.value)}
              />
              {dateStart && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setDateStart("")}
                >
                  <MinusCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          <Label className="text-base">Punteggi Set</Label>

          {sets.map((set, index) => {
            const aWins = set.teamAPoints > set.teamBPoints;
            const bWins = set.teamBPoints > set.teamAPoints;
            return (
              <div
                key={set._key}
                className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Set {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeSet(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Rimuovi</span>
                  </Button>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                  <TeamScoreControl
                    name={getTeamName(0)}
                    score={set.teamAPoints}
                    winning={aWins}
                    onDecrement={() => adjustSet(index, "A", -1)}
                    onIncrement={() => adjustSet(index, "A", 1)}
                    onChange={(v) => handleSetChange(index, "A", v)}
                  />

                  <div className="flex items-center justify-center text-xs font-semibold text-muted-foreground pt-7">
                    VS
                  </div>

                  <TeamScoreControl
                    name={getTeamName(1)}
                    score={set.teamBPoints}
                    winning={bWins}
                    onDecrement={() => adjustSet(index, "B", -1)}
                    onIncrement={() => adjustSet(index, "B", 1)}
                    onChange={(v) => handleSetChange(index, "B", v)}
                  />
                </div>
              </div>
            );
          })}

          {sets.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-4 bg-muted/20 rounded-md border border-dashed border-border/60">
              Nessun set registrato.
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={addSet}
          >
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Set
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvataggio..." : "Salva risultato"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function createKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function TeamScoreControl({
  name,
  score,
  winning,
  onDecrement,
  onIncrement,
  onChange,
}: {
  name: string;
  score: number;
  winning: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-md p-2 transition-colors ${
        winning ? "bg-primary/10 ring-1 ring-primary/40" : "bg-background/40"
      }`}
    >
      <span
        className="text-xs font-medium text-center truncate w-full max-w-full"
        title={name}
      >
        {name}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onDecrement}
          disabled={score <= 0}
          aria-label={`Diminuisci punteggio ${name}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          className="w-12 h-9 text-center font-bold text-base px-1"
          value={score}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Punteggio ${name}`}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onIncrement}
          aria-label={`Aumenta punteggio ${name}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
