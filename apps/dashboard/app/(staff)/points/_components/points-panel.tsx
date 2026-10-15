"use client";

import { Gift, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CountBadge } from "@/app/_components/count-badge";
import { PageBody, PageHeader } from "@/app/_components/page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/tabs";
import { useConfirm } from "@/app/_providers/confirm.provider";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { pointsLabel, signedPoints } from "@/lib/points";
import { cn } from "@/lib/utils";
import { AssignPoints } from "./assign-points";
import { RedemptionCard } from "./redemption-card";
import { RewardCard } from "./reward-card";
import { RewardDialog } from "./reward-dialog";
import { RulesEditor } from "./rules-editor";
import type { PendingRedemption, PointRule, Preset, Reward } from "./types";

/**
 * Punti e premi, lato club.
 *
 * Tre linguette per tre momenti: allo sportello serve «chi deve ritirare
 * cosa», e per questo è la prima; il catalogo premi e i preset si toccano di
 * rado, quando il club decide cosa offrire.
 *
 * I punti di una persona si caricano dalla sua scheda in Clienti: qui non
 * c'è un elenco di persone da duplicare.
 *
 * L'intestazione la disegna il pannello e non la pagina, come in Agenda: da
 * telefono il «+» per un premio nuovo sta accanto al titolo, e compare solo
 * sulla linguetta Premi, quindi deve sapere quale linguetta è aperta.
 *
 * Le azioni che non si riprendono (ritirare un premio, togliere un preset,
 * annullare un riscatto) chiedono conferma: un pannello dal basso da
 * telefono, un toast da desktop (confirm.provider.tsx).
 */

type PointsTab = "redemptions" | "rewards" | "presets" | "rules";

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) throw new Error(payload?.error ?? "Riprova fra poco.");
  return payload;
}

/**
 * `canManageRewards`: il catalogo dei premi lo cura un amministratore. Il
 * resto dello staff lo vede, consegna i riscatti e assegna punti, ma non
 * crea, modifica, mette in pausa o ritira premi, né cambia i preset dei
 * punti (e le route lo rifiutano).
 */
export function PointsPanel({
  canManageRewards,
}: {
  canManageRewards: boolean;
}) {
  const confirm = useConfirm();
  const [tab, setTab] = useState<PointsTab>("redemptions");
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [rules, setRules] = useState<PointRule[] | null>(null);
  const [redemptions, setRedemptions] = useState<PendingRedemption[] | null>(
    null,
  );
  const [pending, setPending] = useState<string | null>(null);

  const [editing, setEditing] = useState<Reward | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const [rewardList, presetList, redemptionList, ruleList] =
      await Promise.all([
        request("/api/dashboard/points/rewards").catch((error) => {
          toast.error("Premi non caricati", { description: error.message });
          return { rewards: [] };
        }),
        request("/api/dashboard/points/presets").catch((error) => {
          toast.error("Preset non caricati", { description: error.message });
          return { presets: [] };
        }),
        request("/api/dashboard/points/redemptions").catch((error) => {
          toast.error("Riscatti non caricati", { description: error.message });
          return { redemptions: [] };
        }),
        request("/api/dashboard/points/rules").catch((error) => {
          toast.error("Azioni premiate non caricate", {
            description: error.message,
          });
          return { rules: [] };
        }),
      ]);

    setRewards(rewardList.rewards);
    setPresets(presetList.presets);
    setRedemptions(redemptionList.redemptions);
    setRules(ruleList.rules);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Un'azione con il suo toast: tutte uguali, cambia solo cosa dicono. */
  const run = async (
    key: string,
    action: () => Promise<unknown>,
    success: string,
    description?: string,
  ) => {
    setPending(key);
    try {
      await action();
      toast.success(success, description ? { description } : undefined);
      await load();
    } catch (error) {
      toast.error("Operazione non riuscita", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
    } finally {
      setPending(null);
    }
  };

  /**
   * Disattiva o riattiva un premio. La levetta si sposta subito e torna
   * indietro se il server dice di no: è un gesto reversibile, non serve
   * aspettare il giro completo per vederlo.
   */
  const toggleReward = async (reward: Reward, disabled: boolean) => {
    const patch = (value: boolean) =>
      setRewards(
        (list) =>
          list?.map((row) =>
            row.id === reward.id ? { ...row, disabled: value } : row,
          ) ?? list,
      );

    setPending(`reward-toggle-${reward.id}`);
    patch(disabled);
    try {
      await request(`/api/dashboard/points/rewards/${reward.id}`, {
        method: "PATCH",
        body: JSON.stringify({ disabled }),
      });
      toast.success(disabled ? "Premio disattivato" : "Premio riattivato", {
        description: disabled
          ? "Non compare più ai clienti. Chi l'ha già riscattato lo ritira lo stesso."
          : "È di nuovo nella vetrina dei clienti.",
      });
    } catch (error) {
      patch(!disabled);
      toast.error("Operazione non riuscita", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
    } finally {
      setPending(null);
    }
  };

  const openReward = (reward: Reward | null) => {
    setEditing(reward);
    setDialogOpen(true);
  };

  const askArchiveReward = async (reward: Reward) => {
    const result = await confirm({
      title: `Ritirare «${reward.title}»?`,
      description:
        "Sparisce dal catalogo e dalla vetrina, e non si può ripristinare. Chi l'ha già riscattato lo ritira lo stesso. Per toglierlo solo per un po', spegni «In vetrina».",
      confirmLabel: "Ritira premio",
      cancelLabel: "Annulla",
      tone: "destructive",
      desktop: "toast",
    });
    if (!result) return;

    void run(
      `reward-${reward.id}`,
      () =>
        request(`/api/dashboard/points/rewards/${reward.id}`, {
          method: "DELETE",
        }),
      "Premio ritirato",
      "Non è più nel catalogo. Chi l'ha già riscattato lo tiene.",
    );
  };

  const askArchivePreset = async (preset: Preset) => {
    const result = await confirm({
      title: `Togliere «${preset.label}»?`,
      description:
        "Non compare più tra le causali. I punti già assegnati con questo preset restano.",
      confirmLabel: "Togli preset",
      cancelLabel: "Annulla",
      tone: "destructive",
      desktop: "toast",
    });
    if (!result) return;

    void run(
      `preset-${preset.id}`,
      () =>
        request(`/api/dashboard/points/presets/${preset.id}`, {
          method: "DELETE",
        }),
      "Preset rimosso",
    );
  };

  const waiting = redemptions?.length ?? 0;

  return (
    <>
      <PageHeader
        title="Punti e premi"
        description="Catalogo premi, causali dei punti, punti automatici e premi riscattati da consegnare."
        actions={
          <div className="flex items-center gap-2">
            {/*
             * Da telefono, come il «+» di Agenda. Fuori dalla linguetta Premi
             * si dissolve senza lasciare il posto: l'intestazione non salta.
             * `inert` lo toglie anche dal Tab e dai lettori di schermo.
             */}
            {canManageRewards && (
              <Button
                size="icon"
                aria-label="Nuovo premio"
                inert={tab !== "rewards"}
                onClick={() => openReward(null)}
                className={cn(
                  "size-10 rounded-full transition-[opacity,scale] duration-200 ease-(--ease-out) md:hidden",
                  tab !== "rewards" && "pointer-events-none scale-90 opacity-0",
                )}
              >
                <Plus className="size-5" />
              </Button>
            )}
            <AssignPoints />
          </div>
        }
      />
      {/* Da telefono «Assegna punti» fluttua sopra la barra in basso: il
          fondo della pagina gli lascia spazio, l'ultima card resta libera. */}
      <PageBody className="pb-20 md:pb-6">
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as PointsTab)}
          className="gap-4"
        >
          <TabsList>
            <TabsTrigger value="redemptions">
              Da consegnare
              <CountBadge count={waiting} />
            </TabsTrigger>
            <TabsTrigger value="rewards">Premi</TabsTrigger>
            <TabsTrigger value="presets">Preset</TabsTrigger>
            <TabsTrigger value="rules">Automatici</TabsTrigger>
          </TabsList>

          <TabsContent value="redemptions">
            <RedemptionsList
              redemptions={redemptions}
              pending={pending}
              onClose={(redemption, action) =>
                void run(
                  redemption.id,
                  () =>
                    request(
                      `/api/dashboard/points/redemptions/${redemption.id}`,
                      {
                        method: "POST",
                        body: JSON.stringify({ action }),
                      },
                    ),
                  action === "used"
                    ? "Premio consegnato"
                    : "Riscatto annullato",
                  action === "cancel"
                    ? `${pointsLabel(redemption.cost)} tornati a ${redemption.playerName}.`
                    : undefined,
                )
              }
            />
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4">
            {/* Da telefono il «+» sta nell'intestazione. */}
            {canManageRewards && (
              <div className="hidden justify-end md:flex">
                <Button onClick={() => openReward(null)}>
                  <Plus className="size-4" />
                  Nuovo premio
                </Button>
              </div>
            )}

            <RewardsGrid
              rewards={rewards}
              pending={pending}
              onEdit={openReward}
              onToggle={(reward, disabled) =>
                void toggleReward(reward, disabled)
              }
              onArchive={(reward) => void askArchiveReward(reward)}
              readOnly={!canManageRewards}
            />
          </TabsContent>

          <TabsContent value="presets">
            <PresetsEditor
              presets={presets}
              pending={pending}
              onSave={(preset) =>
                void run(
                  `preset-${preset.presetId ?? "new"}`,
                  () =>
                    request("/api/dashboard/points/presets", {
                      method: "POST",
                      body: JSON.stringify(preset),
                    }),
                  preset.presetId ? "Preset aggiornato" : "Preset aggiunto",
                )
              }
              onArchive={(preset) => void askArchivePreset(preset)}
              readOnly={!canManageRewards}
            />
          </TabsContent>

          <TabsContent value="rules">
            <RulesEditor
              rules={rules}
              pending={pending}
              onSave={(rule) =>
                void run(
                  `rule-${rule.key}`,
                  () =>
                    request("/api/dashboard/points/rules", {
                      method: "POST",
                      body: JSON.stringify(rule),
                    }),
                  "Azione aggiornata",
                )
              }
              readOnly={!canManageRewards}
            />
          </TabsContent>
        </Tabs>
      </PageBody>

      {canManageRewards && (
        <RewardDialog
          open={dialogOpen}
          reward={editing}
          onOpenChange={setDialogOpen}
          onSaved={() => void load()}
        />
      )}
    </>
  );
}

function RedemptionsList({
  redemptions,
  pending,
  onClose,
}: {
  redemptions: PendingRedemption[] | null;
  pending: string | null;
  onClose: (redemption: PendingRedemption, action: "used" | "cancel") => void;
}) {
  const [query, setQuery] = useState("");
  const confirm = useConfirm();

  // Annullare restituisce i punti e il cliente non ha più il premio: va
  // confermato. Consegnare no, è il gesto di tutti i giorni.
  const askCancel = async (row: PendingRedemption) => {
    const result = await confirm({
      title: "Annullare il riscatto?",
      description: `${row.playerName} non potrà più ritirare «${row.title}» e i ${row.cost} punti gli tornano sul saldo.`,
      confirmLabel: "Annulla il riscatto",
      cancelLabel: "Indietro",
      tone: "destructive",
      desktop: "toast",
    });
    if (result) onClose(row, "cancel");
  };

  // Allo sportello si cerca per codice, letto dal telefono del cliente, o per
  // nome quando il codice non lo trova più.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!redemptions || !needle) return redemptions;

    return redemptions.filter(
      (row) =>
        row.code.toLowerCase().includes(needle) ||
        row.playerName.toLowerCase().includes(needle),
    );
  }, [redemptions, query]);

  if (!visible) return <ListSkeleton />;

  if (redemptions?.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Gift />
          </EmptyMedia>
          <EmptyTitle>Nessun premio da consegnare</EmptyTitle>
          <EmptyDescription>
            Quando un cliente riscatta un premio dalla sua area personale, lo
            trovi qui con il codice da controllare.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative md:max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
        <Input
          aria-label="Cerca per codice o nome"
          placeholder="Codice o nome"
          className="bg-card h-11 rounded-xl pl-10 text-base md:h-9 md:text-sm"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((row) => (
          <RedemptionCard
            key={row.id}
            redemption={row}
            busy={pending === row.id}
            disabled={pending !== null}
            onDeliver={() => onClose(row, "used")}
            onCancel={() => void askCancel(row)}
          />
        ))}
      </div>
    </div>
  );
}

function RewardsGrid({
  rewards,
  pending,
  onEdit,
  onToggle,
  onArchive,
  readOnly,
}: {
  rewards: Reward[] | null;
  pending: string | null;
  onEdit: (reward: Reward) => void;
  onToggle: (reward: Reward, disabled: boolean) => void;
  onArchive: (reward: Reward) => void;
  readOnly: boolean;
}) {
  if (!rewards) return <ListSkeleton />;

  if (rewards.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Gift />
          </EmptyMedia>
          <EmptyTitle>Ancora nessun premio</EmptyTitle>
          <EmptyDescription>
            {readOnly
              ? "I premi li aggiunge un amministratore. Appena ce n'è uno, lo trovi qui."
              : "Crea il primo: foto, titolo, costo in punti. I clienti lo vedono subito nella loro area personale, con quanti punti mancano."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rewards.map((reward) => (
        <li key={reward.id} className="flex">
          <RewardCard
            reward={reward}
            toggling={pending === `reward-toggle-${reward.id}`}
            archiving={pending === `reward-${reward.id}`}
            disabled={pending !== null}
            onEdit={() => onEdit(reward)}
            onToggle={(disabled) => onToggle(reward, disabled)}
            onArchive={() => onArchive(reward)}
            readOnly={readOnly}
          />
        </li>
      ))}
    </ul>
  );
}

function PresetsEditor({
  presets,
  pending,
  onSave,
  onArchive,
  readOnly,
}: {
  presets: Preset[] | null;
  pending: string | null;
  onSave: (preset: {
    presetId?: string;
    label: string;
    points: number;
  }) => void;
  onArchive: (preset: Preset) => void;
  /** I preset li decide un amministratore: gli altri li usano e basta. */
  readOnly: boolean;
}) {
  const [label, setLabel] = useState("");
  const [points, setPoints] = useState("");

  if (!presets) return <ListSkeleton />;

  const add = () => {
    const value = Number(points);

    if (label.trim().length < 2) {
      toast.error("Dai un nome al preset.");
      return;
    }
    if (!Number.isInteger(value) || value === 0) {
      toast.error(
        "I punti sono un intero diverso da zero: negativo per togliere.",
      );
      return;
    }

    onSave({ label: label.trim(), points: value });
    setLabel("");
    setPoints("");
  };

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-muted-foreground text-sm">
        Le causali con cui carichi punti dalla scheda di un cliente con un
        tocco. Un numero negativo toglie punti, per esempio per una penalità.
        {readOnly && " Le aggiunge e le cambia un amministratore."}
      </p>

      <ul className="divide-y rounded-xl border bg-card">
        {presets.map((preset) => (
          <PresetRow
            key={preset.id}
            preset={preset}
            busy={pending === `preset-${preset.id}`}
            disabled={pending !== null}
            onSave={(next) => onSave({ presetId: preset.id, ...next })}
            onArchive={() => onArchive(preset)}
            readOnly={readOnly}
          />
        ))}
        {presets.length === 0 && (
          <li className="text-muted-foreground p-4 text-sm">
            {readOnly
              ? "Ancora nessun preset."
              : "Nessun preset: aggiungine uno qui sotto."}
          </li>
        )}
      </ul>

      {!readOnly && (
        <div className="grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_8rem_auto]">
          <Input
            aria-label="Nome del preset"
            placeholder="Es. Torneo sociale vinto"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
          <Input
            aria-label="Punti"
            type="number"
            inputMode="numeric"
            step={1}
            placeholder="Punti"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
          />
          <Button onClick={add} disabled={pending !== null}>
            {pending === "preset-new" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Aggiungi
          </Button>
        </div>
      )}
    </div>
  );
}

function PresetRow({
  preset,
  busy,
  disabled,
  onSave,
  onArchive,
  readOnly,
}: {
  preset: Preset;
  busy: boolean;
  disabled: boolean;
  onSave: (next: { label: string; points: number }) => void;
  onArchive: () => void;
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(preset.label);
  const [points, setPoints] = useState(String(preset.points));

  if (editing) {
    return (
      <li className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[1fr_8rem_auto]">
        <Input
          aria-label="Nome del preset"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Input
          aria-label="Punti"
          type="number"
          inputMode="numeric"
          step={1}
          value={points}
          onChange={(event) => setPoints(event.target.value)}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={disabled}
            onClick={() => {
              onSave({ label: label.trim(), points: Number(points) });
              setEditing(false);
            }}
          >
            Salva
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Annulla
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "w-12 shrink-0 font-mono font-medium tabular-nums",
            preset.points > 0 ? "text-success" : "text-destructive",
          )}
        >
          {signedPoints(preset.points)}
        </span>
        <span className="truncate">{preset.label}</span>
      </div>
      {!readOnly && (
        <div className="flex shrink-0 gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={`Modifica ${preset.label}`}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive size-8"
            aria-label={`Rimuovi ${preset.label}`}
            disabled={disabled}
            onClick={onArchive}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>
      )}
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
