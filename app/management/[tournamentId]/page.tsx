"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import MatchEditor from "./match-editor";

export default function TournamentManagementPage() {
  const { tournamentId: slug } = useParams<{ tournamentId: string }>();
  const tournament = useQuery(api.modules.tournaments.get.bySlug, { slug });

  const editComment = useMutation(api.modules.tournaments.edit.editComment);

  const [commentTitle, setCommentTitle] = useState("");
  const [commentContent, setCommentContent] = useState("");

  // Set initial states when tournament loads
  useEffect(() => {
    if (tournament?.comment) {
      setCommentTitle(tournament.comment.title);
      setCommentContent(tournament.comment.content || "");
    }
  }, [tournament]);

  if (tournament === undefined) {
    return (
      <div className="flex justify-center mt-10">
        <Spinner />
      </div>
    );
  }

  if (tournament === null) {
    return <div>Torneo non trovato</div>;
  }

  const handleSaveComment = async () => {
    try {
      await editComment({
        tournamentId: tournament._id,
        comment: commentTitle
          ? { title: commentTitle, content: commentContent }
          : undefined,
      });
      toast.success("Commento aggiornato con successo");
    } catch (e) {
      toast.error("Errore durante l'aggiornamento del commento");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/management">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-2xl font-bold">Gestione: {tournament.name}</h2>
      </div>

      <Tabs defaultValue="matches" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="matches">Modifica Match</TabsTrigger>
          <TabsTrigger value="settings">Impostazioni</TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          <MatchesManagement tournamentId={tournament._id} />
        </TabsContent>

        <TabsContent value="settings">
          <Card className="bg-background text-foreground border-border">
            <CardHeader>
              <CardTitle>Commento in evidenza</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titolo Commento</Label>
                <Input
                  value={commentTitle}
                  onChange={(e) => setCommentTitle(e.target.value)}
                  placeholder="es: Avviso maltempo"
                />
              </div>
              <div className="space-y-2">
                <Label>Contenuto</Label>
                <Textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Inserisci i dettagli qui..."
                  rows={4}
                />
              </div>
              <Button onClick={handleSaveComment}>Salva Commento</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MatchesManagement({ tournamentId }: { tournamentId: string }) {
  const matches = useQuery(
    api.modules.tournaments.matches.get.getAllByTournamentId,
    { tournamentId },
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  if (matches === undefined) {
    return (
      <div className="flex justify-center p-6">
        <Spinner />
      </div>
    );
  }

  // Estrai le categorie uniche
  const categoriesMap = new Map();
  matches.forEach((m: any) => {
    if (m.categoryId && m.categoryName) {
      categoriesMap.set(m.categoryId, m.categoryName);
    }
  });
  const categories = Array.from(categoriesMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  // Estrai i gironi unici in base alla categoria selezionata
  const groupsMap = new Map();
  if (selectedCategory !== "all") {
    matches.forEach((m: any) => {
      if (m.categoryId === selectedCategory && m.groupId && m.groupName) {
        groupsMap.set(m.groupId, m.groupName);
      }
    });
  }
  const groups = Array.from(groupsMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  // Filtra i match
  const filteredMatches = matches.filter((match: any) => {
    if (selectedCategory !== "all" && match.categoryId !== selectedCategory)
      return false;
    if (selectedGroup !== "all" && match.groupId !== selectedGroup)
      return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const hasMatch = match.teams?.some((team: any) => {
        if (team.name?.toLowerCase().includes(term)) return true;
        return team.players?.some(
          (player: any) =>
            player.name?.toLowerCase().includes(term) ||
            player.firstName?.toLowerCase().includes(term) ||
            player.lastName?.toLowerCase().includes(term),
        );
      });
      if (!hasMatch) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-muted/20 p-4 rounded-xl border border-border">
        <div className="space-y-2">
          <Label>Cerca giocatori/squadra</Label>
          <Input
            placeholder="Nome o cognome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={selectedCategory}
            onValueChange={(val) => {
              setSelectedCategory(val);
              setSelectedGroup("all");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tutte le categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Girone / Fase</Label>
          <Select
            value={selectedGroup}
            onValueChange={setSelectedGroup}
            disabled={selectedCategory === "all" || groups.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  selectedCategory === "all"
                    ? "Seleziona prima una categoria"
                    : "Tutti i gironi"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i gironi</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-sm text-foreground/70 mb-2">
        Mostrati {filteredMatches.length} match su {matches.length}
      </div>

      {filteredMatches.map((match: any) => (
        <MatchEditor key={match._id} match={match} />
      ))}
      {filteredMatches.length === 0 && (
        <div className="text-center text-muted-foreground p-8 border rounded-xl border-dashed">
          <p>Nessun match corrisponde ai criteri di ricerca attuali.</p>
          <Button
            variant="link"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("all");
              setSelectedGroup("all");
            }}
          >
            Resetta Filtri
          </Button>
        </div>
      )}
    </div>
  );
}
