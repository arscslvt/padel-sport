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
  const [dateStart, setDateStart] = useState(match.scheduledAt || "");
  const [sets, setSets] = useState<
    { teamAPoints: number; teamBPoints: number }[]
  >(match.sets || []);

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
        dateStart: dateStart || undefined,
        sets,
      });
      setIsEditing(false);
      toast.success("Match aggiornato");
    } catch (e) {
      toast.error("Errore salvataggio match");
    }
  };

  const handleSetChange = (index: number, team: "A" | "B", value: string) => {
    const newSets = [...sets];
    if (team === "A") {
      newSets[index].teamAPoints = parseInt(value) || 0;
    } else {
      newSets[index].teamBPoints = parseInt(value) || 0;
    }
    setSets(newSets);
  };

  const addSet = () => {
    setSets([...sets, { teamAPoints: 0, teamBPoints: 0 }]);
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
            <Label>Data e Ora (ISO)</Label>
            <Input
              type="text"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              placeholder="es: 2024-05-18T10:00:00Z"
            />
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex justify-between items-center">
            <Label>Punteggi Set</Label>
            <Button variant="ghost" size="sm" onClick={addSet}>
              + Aggiungi Set
            </Button>
          </div>
          {sets.map((set, index) => (
            <div
              key={index}
              className="flex items-center gap-4 bg-muted/30 p-2 rounded-md"
            >
              <span className="text-sm font-medium w-6">S{index + 1}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs truncate w-16">{getTeamName(0)}</span>
                <Input
                  type="number"
                  className="w-16 h-8 text-center"
                  value={set.teamAPoints}
                  onChange={(e) => handleSetChange(index, "A", e.target.value)}
                />
              </div>
              <span className="text-muted-foreground">-</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-16 h-8 text-center"
                  value={set.teamBPoints}
                  onChange={(e) => handleSetChange(index, "B", e.target.value)}
                />
                <span className="text-xs truncate w-16">{getTeamName(1)}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive ml-auto"
                onClick={() => removeSet(index)}
              >
                ✕
              </Button>
            </div>
          ))}
          {sets.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Nessun set registrato.
            </p>
          )}
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
