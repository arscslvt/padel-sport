"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Minus, MinusCircle, Plus, Trash2 } from "lucide-react";

export default function MatchEditor({ match }: { match: any }) {
  const editMatch = useMutation(api.modules.tournaments.matches.edit.editMatch);

  const [status, setStatus] = useState(
    match.status === "in_progress"
      ? "live"
      : match.status === "finished"
        ? "completed"
        : match.status,
  );
  const [stage, setStage] = useState(match.stage);
  const [dateStart, setDateStart] = useState(
    match.scheduledAt
      ? format(new Date(match.scheduledAt), "yyyy-MM-dd'T'HH:mm")
      : "",
  );
  const [sets, setSets] = useState<
    { teamAPoints: number; teamBPoints: number; _key: string }[]
  >(() =>
    (match.sets || []).map(
      (s: { teamAPoints: number; teamBPoints: number }) => ({
        teamAPoints: s.teamAPoints,
        teamBPoints: s.teamBPoints,
        _key:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2),
      }),
    ),
  );

  const [isEditing, setIsEditing] = useState(false);

  const getTeamName = (teamIndex: number) => {
    return match.teams[teamIndex]?.name || `Team ${teamIndex + 1}`;
  };

  const handleSave = async () => {
    try {
      await editMatch({
        matchId: match._id,
        status,
        stage: stage || undefined,
        dateStart: dateStart ? new Date(dateStart).toISOString() : undefined,
        sets: sets.map(({ teamAPoints, teamBPoints }) => ({
          teamAPoints,
          teamBPoints,
        })),
      });
      setIsEditing(false);
      toast.success("Match aggiornato");
    } catch (e) {
      toast.error("Errore salvataggio match");
    }
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
    const key =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    setSets([...sets, { teamAPoints: 0, teamBPoints: 0, _key: key }]);
  };

  const removeSet = (index: number) => {
    setSets(sets.filter((_, i) => i !== index));
  };

  if (!isEditing) {
    return (
      <Card className="bg-background text-foreground border-border">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-semibold uppercase">
              {match.categoryName} • {match.groupName || match.stage}
            </span>
            <CardTitle className="text-base mt-1">
              {getTeamName(0)} vs {getTeamName(1)}
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Modifica
          </Button>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-background text-foreground border-primary/50 shadow-md">
      <CardHeader className="py-3 px-4 border-b">
        <span className="text-sm font-semibold uppercase text-muted-foreground">
          {match.categoryName}
        </span>
        <CardTitle className="text-lg">
          {getTeamName(0)} vs {getTeamName(1)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Stato Match</Label>
            <Select value={status} onValueChange={setStatus}>
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
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">Fase a gironi</SelectItem>
                <SelectItem value="round16">Ottavi</SelectItem>
                <SelectItem value="quarter">Quarti</SelectItem>
                <SelectItem value="semi">Semifinale</SelectItem>
                <SelectItem value="final">Finale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data e Ora</Label>
            <div className="flex items-center gap-2">
              <Input
                type="datetime-local"
                value={dateStart}
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
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave}>Salva e chiudi</Button>
        </div>
      </CardContent>
    </Card>
  );
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
