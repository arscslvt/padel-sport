"use client";

import { useMutation, useQuery } from "convex/react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  CircleDot,
  ExternalLink,
  Filter,
  Gamepad2,
  Info,
  ListFilter,
  Radio,
  RotateCcw,
  Search,
  Settings2,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import KnockoutBracket from "../../tournament/components/knockout-bracket";
import StageAdvancementPanel from "../../tournament/components/stage-advancement-panel";
import MatchEditor, { type MatchEditorMatch } from "./match-editor";

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
    } catch {
      toast.error("Errore durante l'aggiornamento del commento");
    }
  };

  return (
    <div className="py-6 md:py-8">
      <div className="mb-6 flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
          <Link href="/management">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Console torneo
          </p>
          <h1 className="mt-1 truncate font-heading text-2xl font-bold md:text-3xl">
            {tournament.name}
          </h1>
        </div>
        <Button variant="outline" asChild className="hidden sm:flex">
          <Link
            href={`/tournament/${tournament.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Vista pubblica <ExternalLink className="size-4" />
          </Link>
        </Button>
      </div>

      <TournamentOverview tournamentId={tournament._id} />

      <Tabs
        defaultValue="matches"
        className="w-full xl:grid xl:grid-cols-[230px_minmax(0,1fr)] xl:items-start xl:gap-8"
      >
        <TabsList className="sticky top-20 z-30 mb-6 grid h-auto w-full grid-cols-3 gap-1 border bg-background/90 p-1.5 shadow-sm backdrop-blur-xl md:relative md:top-0 md:w-fit xl:sticky xl:top-24 xl:mb-0 xl:flex xl:w-full xl:flex-col xl:items-stretch xl:gap-1 xl:rounded-2xl xl:p-2">
          <TabsTrigger
            value="matches"
            className="gap-2 px-3 py-2.5 xl:h-auto xl:flex-none xl:justify-start xl:py-3"
          >
            <Gamepad2 className="size-4" />
            <span className="text-left">
              <span className="hidden sm:block">Partite</span>
              <span className="sm:hidden">Match</span>
              <span className="mt-0.5 hidden text-[11px] font-normal text-muted-foreground xl:block">
                Risultati e orari
              </span>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="advancements"
            className="gap-2 px-3 py-2.5 xl:h-auto xl:flex-none xl:justify-start xl:py-3"
          >
            <Trophy className="size-4" />
            <span className="text-left">
              <span className="block">Fasi finali</span>
              <span className="mt-0.5 hidden text-[11px] font-normal text-muted-foreground xl:block">
                Tabellone e qualifiche
              </span>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="gap-2 px-3 py-2.5 xl:h-auto xl:flex-none xl:justify-start xl:py-3"
          >
            <Settings2 className="size-4" />
            <span className="text-left">
              <span className="hidden sm:block">Comunicazioni</span>
              <span className="sm:hidden">Avvisi</span>
              <span className="mt-0.5 hidden text-[11px] font-normal text-muted-foreground xl:block">
                Avvisi al pubblico
              </span>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="matches"
          className="min-w-0 xl:col-start-2 xl:row-start-1"
        >
          <MatchesManagement tournamentId={tournament._id} />
        </TabsContent>

        <TabsContent
          value="advancements"
          className="min-w-0 xl:col-start-2 xl:row-start-1"
        >
          <AdvancementManagement tournamentId={tournament._id} />
        </TabsContent>

        <TabsContent
          value="settings"
          className="min-w-0 xl:col-start-2 xl:row-start-1"
        >
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-content-center rounded-xl bg-amber-500/10 text-amber-500">
                    <Info className="size-5" />
                  </span>
                  <div>
                    <CardTitle>Avviso pubblico</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Il messaggio sarà mostrato in evidenza nella pagina del
                      torneo.
                    </p>
                  </div>
                </div>
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
                    rows={7}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveComment}>Pubblica avviso</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="sticky top-24 hidden self-start border-border/70 bg-card 2xl:flex">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Anteprima desktop
                </p>
                <CardTitle className="text-base">Pagina pubblica</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border-2 border-muted/50 bg-muted/30 p-4">
                  <p className="font-semibold">
                    {commentTitle.trim() || "Titolo dell’avviso"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {commentContent.trim() ||
                      "Il contenuto inserito apparirà qui per tutti i partecipanti."}
                  </p>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  L’anteprima si aggiorna mentre scrivi. Pubblica per renderla
                  visibile.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TournamentOverview({ tournamentId }: { tournamentId: string }) {
  const matches = useQuery(
    api.modules.tournaments.matches.get.getAllByTournamentId,
    { tournamentId },
  ) as Array<{ status: "scheduled" | "in_progress" | "finished" }> | undefined;
  const categories = useQuery(
    api.modules.tournaments.categories.get.byTournamentId,
    { tournamentId },
  );

  if (!matches || !categories) {
    return <div className="mb-6 h-24 animate-pulse rounded-2xl bg-muted/30" />;
  }

  const live = matches.filter((match) => match.status === "in_progress").length;
  const scheduled = matches.filter(
    (match) => match.status === "scheduled",
  ).length;
  const completed = matches.filter(
    (match) => match.status === "finished",
  ).length;
  const knockout = categories.filter(
    (category) => category.currentStage !== "group",
  ).length;

  const stats = [
    {
      label: "Live ora",
      value: live,
      icon: Radio,
      tone: "text-red-500 bg-red-500/10",
    },
    {
      label: "Da giocare",
      value: scheduled,
      icon: CalendarClock,
      tone: "text-blue-400 bg-blue-500/10",
    },
    {
      label: "Completati",
      value: completed,
      icon: CheckCircle2,
      tone: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: "Fasi finali",
      value: `${knockout}/${categories.length}`,
      icon: Trophy,
      tone: "text-amber-500 bg-amber-500/10",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/70 py-0">
          <CardContent className="flex items-center gap-3 p-3.5 md:p-4">
            <span
              className={`grid size-9 shrink-0 place-content-center rounded-xl ${stat.tone}`}
            >
              <stat.icon className="size-4" />
            </span>
            <div>
              <p className="text-xl font-bold leading-none">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MatchesManagement({ tournamentId }: { tournamentId: string }) {
  const matches = useQuery(
    api.modules.tournaments.matches.get.getAllByTournamentId,
    { tournamentId },
  ) as
    | Array<
        Omit<MatchEditorMatch, "teams"> & {
          categoryId?: string;
          groupId?: string;
          teams: Array<{
            name: string;
            players?: Array<{
              name: string;
              firstName?: string;
              lastName: string;
            }>;
          }>;
        }
      >
    | undefined;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "in_progress" | "scheduled" | "finished"
  >("all");

  if (matches === undefined) {
    return (
      <div className="flex justify-center p-6">
        <Spinner />
      </div>
    );
  }

  // Estrai le categorie uniche
  const categoriesMap = new Map<string, string>();
  matches.forEach((m) => {
    if (m.categoryId && m.categoryName) {
      categoriesMap.set(m.categoryId, m.categoryName);
    }
  });
  const categories = Array.from(categoriesMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  // Estrai i gironi unici in base alla categoria selezionata
  const groupsMap = new Map<string, string>();
  if (selectedCategory !== "all") {
    matches.forEach((m) => {
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
  const filteredMatches = matches.filter((match) => {
    if (selectedCategory !== "all" && match.categoryId !== selectedCategory)
      return false;
    if (selectedGroup !== "all" && match.groupId !== selectedGroup)
      return false;
    if (selectedStage !== "all" && match.stage !== selectedStage) return false;
    if (statusFilter !== "all" && match.status !== statusFilter) return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const hasMatch = match.teams?.some((team) => {
        if (team.name?.toLowerCase().includes(term)) return true;
        return team.players?.some(
          (player) =>
            player.name?.toLowerCase().includes(term) ||
            player.firstName?.toLowerCase().includes(term) ||
            player.lastName?.toLowerCase().includes(term),
        );
      });
      if (!hasMatch) return false;
    }
    return true;
  });

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedGroup("all");
    setSelectedStage("all");
    setStatusFilter("all");
  };
  const hasActiveFilters =
    searchTerm !== "" ||
    selectedCategory !== "all" ||
    selectedGroup !== "all" ||
    selectedStage !== "all" ||
    statusFilter !== "all";
  const statusOptions = [
    { value: "all" as const, label: "Tutti", count: matches.length },
    {
      value: "in_progress" as const,
      label: "Live",
      count: matches.filter((match) => match.status === "in_progress").length,
    },
    {
      value: "scheduled" as const,
      label: "Da giocare",
      count: matches.filter((match) => match.status === "scheduled").length,
    },
    {
      value: "finished" as const,
      label: "Completati",
      count: matches.filter((match) => match.status === "finished").length,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-heading text-lg font-bold">Gestione partite</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dai priorità ai live, programma gli incontri e registra i risultati.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={statusFilter === option.value ? "default" : "outline"}
            className="h-auto justify-between px-3 py-3"
            onClick={() => setStatusFilter(option.value)}
          >
            <span className="flex items-center gap-2">
              {option.value === "in_progress" && (
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
              )}
              {option.label}
            </span>
            <Badge variant="secondary">{option.count}</Badge>
          </Button>
        ))}
      </div>

      <Card className="border-border/70 py-0">
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListFilter className="size-4 text-muted-foreground" /> Filtri
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="size-3.5" /> Azzera
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 md:col-span-2 xl:col-span-1">
              <Label htmlFor="match-search">Squadra o giocatore</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="match-search"
                  className="pl-9"
                  placeholder="Cerca per nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
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
              <Label>Fase</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le fasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le fasi</SelectItem>
                  <SelectItem value="group">Gironi</SelectItem>
                  <SelectItem value="quarter">Quarti</SelectItem>
                  <SelectItem value="semi">Semifinali</SelectItem>
                  <SelectItem value="final">Finale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Girone</Label>
              <Select
                value={selectedGroup}
                onValueChange={setSelectedGroup}
                disabled={selectedCategory === "all" || groups.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tutti i gironi" />
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
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          <strong className="text-foreground">{filteredMatches.length}</strong>{" "}
          di {matches.length} partite
        </span>
        {hasActiveFilters && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Filter className="size-3" /> Filtri attivi
          </span>
        )}
      </div>

      {filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          <Search className="mx-auto mb-3 size-7" />
          <p className="font-medium text-foreground">Nessuna partita trovata</p>
          <p className="mt-1 text-sm">Prova a modificare i filtri applicati.</p>
          <Button variant="link" onClick={resetFilters}>
            Azzera tutti i filtri
          </Button>
        </div>
      ) : (
        <MatchesByStatus matches={filteredMatches} />
      )}
    </div>
  );
}

function AdvancementManagement({ tournamentId }: { tournamentId: string }) {
  const generateKnockoutMatches = useMutation(
    api.modules.tournaments.advancements.generateKnockoutMatches,
  );
  const resetKnockoutMatches = useMutation(
    api.modules.tournaments.advancements.resetKnockoutMatches,
  );
  const categories = useQuery(
    api.modules.tournaments.categories.get.byTournamentId,
    {
      tournamentId,
    },
  );
  const allMatches = useQuery(
    api.modules.tournaments.matches.get.getAllByTournamentId,
    { tournamentId },
  ) as Array<{ categoryId?: string; stage?: string }> | undefined;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<
    "quarter" | "semi" | "final"
  >("quarter");
  const [isGenerating, setIsGenerating] = useState(false);
  const savedInitialSelection = useQuery(
    api.modules.tournaments.advancements.getSelectionByCategoryStage,
    selectedCategoryId
      ? { tournamentCategoryId: selectedCategoryId, stage: selectedStage }
      : "skip",
  );

  useEffect(() => {
    if (!categories || categories.length === 0) return;

    if (
      !selectedCategoryId ||
      !categories.some((category) => category._id === selectedCategoryId)
    ) {
      setSelectedCategoryId(categories[0]._id);
    }
  }, [categories, selectedCategoryId]);

  if (categories === undefined || allMatches === undefined) {
    return (
      <div className="flex justify-center p-6">
        <Spinner />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Nessuna categoria trovata per questo torneo.
      </div>
    );
  }

  const selectedCategory =
    categories.find((category) => category._id === selectedCategoryId) ??
    categories[0];

  const stageLabelMap: Record<"quarter" | "semi" | "final", string> = {
    quarter: "Quarti di finale",
    semi: "Semifinali",
    final: "Finale",
  };

  const categoryMatches = allMatches.filter(
    (match) =>
      match.categoryId === selectedCategory._id && match.stage !== "group",
  );
  const hasQuarter = categoryMatches.some((match) => match.stage === "quarter");
  const hasSemi = categoryMatches.some((match) => match.stage === "semi");
  const hasFinal = categoryMatches.some((match) => match.stage === "final");
  const hasKnockoutMatches = categoryMatches.length > 0;
  const stageRank: Record<"quarter" | "semi" | "final", number> = {
    quarter: 1,
    semi: 2,
    final: 3,
  };
  const latestKnockoutStage = categoryMatches.reduce<
    "quarter" | "semi" | "final" | null
  >((latest, match) => {
    if (
      match.stage !== "quarter" &&
      match.stage !== "semi" &&
      match.stage !== "final"
    ) {
      return latest;
    }
    if (!latest) return match.stage;
    return stageRank[match.stage] > stageRank[latest] ? match.stage : latest;
  }, null);
  const stageToGenerate: "quarter" | "semi" | "final" | null =
    !hasKnockoutMatches
      ? selectedStage
      : hasQuarter && !hasSemi
        ? "semi"
        : hasSemi && !hasFinal
          ? "final"
          : null;
  const requiredTeams = { quarter: 8, semi: 4, final: 2 }[selectedStage];
  const initialSelectionReady =
    hasKnockoutMatches ||
    savedInitialSelection?.qualifiedTeamIds.length === requiredTeams;
  const stageSteps = [
    { key: "quarter", label: "Quarti", done: hasQuarter },
    { key: "semi", label: "Semifinali", done: hasSemi },
    { key: "final", label: "Finale", done: hasFinal },
  ];

  const handleGenerateKnockoutMatches = async () => {
    if (!stageToGenerate) return;
    setIsGenerating(true);
    try {
      await generateKnockoutMatches({
        tournamentCategoryId: selectedCategory._id,
        stage: stageToGenerate,
      });
      toast.success(
        `Match ${stageLabelMap[stageToGenerate]} generati con successo`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante la generazione dei match",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetKnockoutMatches = async () => {
    if (!latestKnockoutStage) return;

    const confirmed = window.confirm(
      `Vuoi annullare ${stageLabelMap[latestKnockoutStage].toLowerCase()} e tutti i turni successivi?`,
    );
    if (!confirmed) return;

    setIsGenerating(true);
    try {
      const result = await resetKnockoutMatches({
        tournamentCategoryId: selectedCategory._id,
        stage: latestKnockoutStage,
      });
      toast.success(
        `Bracket annullato. Ripartirai dalla fase ${result.currentStage}.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore durante il reset",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-lg font-bold">Fasi finali</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Seleziona le qualificate e accompagna il tabellone fino alla finale.
        </p>
      </div>

      <Card className="border-border/70 bg-card">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full max-w-sm space-y-2">
              <Label>Categoria da gestire</Label>
              <Select
                value={selectedCategory._id}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="w-fit px-3 py-1.5">
              <CircleDot className="size-3.5" />
              {selectedCategory.currentStage === "completed"
                ? "Categoria conclusa"
                : `Fase: ${selectedCategory.currentStage}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid grid-cols-3 gap-2">
            {stageSteps.map((step, index) => {
              const active = stageToGenerate === step.key;
              return (
                <div
                  key={step.key}
                  className={`rounded-xl border p-3 transition-colors ${
                    step.done
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : active
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/60 bg-muted/20"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Step {index + 1}
                    </span>
                    {step.done ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <span className="grid size-4 place-content-center rounded-full border text-[9px] text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs font-semibold sm:text-sm">
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          {!hasKnockoutMatches && (
            <div className="grid gap-4 rounded-xl border border-dashed p-4 md:grid-cols-[1fr_220px] md:items-end">
              <div>
                <p className="font-semibold">1. Imposta il turno di partenza</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Poi seleziona e salva esattamente {requiredTeams} squadre
                  nella sezione sottostante.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Turno iniziale</Label>
                <Select
                  value={selectedStage}
                  onValueChange={(value) =>
                    setSelectedStage(value as "quarter" | "semi" | "final")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarter">Quarti · 8 squadre</SelectItem>
                    <SelectItem value="semi">Semifinali · 4 squadre</SelectItem>
                    <SelectItem value="final">Finale · 2 squadre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {stageToGenerate && (
            <div className="flex flex-col gap-3 rounded-xl bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">
                  Prossima azione: genera {stageLabelMap[stageToGenerate]}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {!hasKnockoutMatches && !initialSelectionReady
                    ? "Prima salva la selezione delle squadre qualificate."
                    : hasKnockoutMatches
                      ? "Saranno utilizzate le vincitrici del turno precedente."
                      : "La selezione è pronta: puoi creare gli accoppiamenti."}
                </p>
              </div>
              <Button
                onClick={handleGenerateKnockoutMatches}
                disabled={isGenerating || !initialSelectionReady}
                className="shrink-0"
              >
                <Trophy className="size-4" />
                {isGenerating
                  ? "Generazione..."
                  : `Genera ${stageLabelMap[stageToGenerate]}`}
              </Button>
            </div>
          )}

          {hasKnockoutMatches && latestKnockoutStage && (
            <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">
                  Annulla {stageLabelMap[latestKnockoutStage]}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Elimina questo turno e tutti quelli successivi per correggere
                  un errore di selezione o di seeding.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleResetKnockoutMatches}
                disabled={isGenerating}
                className="shrink-0"
              >
                <RotateCcw className="size-4" />
                Annulla bracket
              </Button>
            </div>
          )}

          {!stageToGenerate && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
              <div>
                <p className="font-semibold">Tabellone completo</p>
                <p className="text-xs text-muted-foreground">
                  Registra il risultato della finale nella scheda Partite.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {stageToGenerate && (
        <StageAdvancementPanel
          tournamentCategoryId={selectedCategory._id}
          stage={stageToGenerate}
          editable
        />
      )}

      {hasKnockoutMatches ? (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-amber-500" /> Tabellone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <KnockoutBracket tournamentCategoryId={selectedCategory._id} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

type ManagedMatch = MatchEditorMatch;

function MatchesByStatus({ matches }: { matches: ManagedMatch[] }) {
  const live = matches.filter((m) => m.status === "in_progress");
  const scheduled = matches.filter((m) => m.status === "scheduled");
  const completed = matches.filter((m) => m.status === "finished");

  return (
    <div className="flex flex-col gap-6">
      {live.length > 0 && (
        <MatchesSection
          title="Live"
          count={live.length}
          matches={live}
          variant="live"
        />
      )}
      {scheduled.length > 0 && (
        <MatchesSection
          title="Da giocare"
          count={scheduled.length}
          matches={scheduled}
          variant="scheduled"
        />
      )}
      {completed.length > 0 && (
        <MatchesSection
          title="Completati"
          count={completed.length}
          matches={completed}
          variant="completed"
        />
      )}
    </div>
  );
}

function MatchesSection({
  title,
  count,
  matches,
  variant,
}: {
  title: string;
  count: number;
  matches: ManagedMatch[];
  variant: "live" | "scheduled" | "completed";
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="sticky top-36 z-20 -mx-2 flex items-center gap-2 rounded-xl border border-border/50 bg-background/90 px-3 py-2 backdrop-blur-xl md:top-16">
        {variant === "live" && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        )}
        {variant === "scheduled" && (
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        )}
        {variant === "completed" && (
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
        )}
        <h3
          className={`text-sm font-semibold uppercase tracking-wide ${
            variant === "live"
              ? "text-red-500"
              : variant === "completed"
                ? "text-muted-foreground"
                : "text-foreground"
          }`}
        >
          {title}
        </h3>
        <Badge variant="secondary" className="ml-auto">
          {count}
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
        {matches.map((match) => (
          <MatchEditor key={match._id} match={match} />
        ))}
      </div>
    </section>
  );
}
