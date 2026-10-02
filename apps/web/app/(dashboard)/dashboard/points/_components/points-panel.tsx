"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Check,
  Gift,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/(dashboard)/_components/tabs";
import { Badge } from "@/components/ui/badge";
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

import { RewardDialog } from "./reward-dialog";
import type { PendingRedemption, Preset, Reward } from "./types";

/**
 * Punti e premi, lato club.
 *
 * Tre linguette per tre momenti: allo sportello serve «chi deve ritirare
 * cosa», e per questo è la prima; il catalogo premi e i preset si toccano di
 * rado, quando il club decide cosa offrire.
 *
 * I punti di una persona si caricano dalla sua scheda in Clienti: qui non
 * c'è un elenco di persone da duplicare.
 */

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) throw new Error(payload?.error ?? "Riprova fra poco.");
  return payload;
}

export function PointsPanel() {
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [redemptions, setRedemptions] = useState<PendingRedemption[] | null>(
    null,
  );
  const [pending, setPending] = useState<string | null>(null);

  const [editing, setEditing] = useState<Reward | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const [rewardList, presetList, redemptionList] = await Promise.all([
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
    ]);

    setRewards(rewardList.rewards);
    setPresets(presetList.presets);
    setRedemptions(redemptionList.redemptions);
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

  const openReward = (reward: Reward | null) => {
    setEditing(reward);
    setDialogOpen(true);
  };

  const waiting = redemptions?.length ?? 0;

  return (
    <>
      <Tabs defaultValue="redemptions" className="gap-4">
        <TabsList>
          <TabsTrigger value="redemptions">
            Da consegnare
            {waiting > 0 && (
              <Badge className="ml-1 h-5 min-w-5 px-1.5 tabular-nums">
                {waiting}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rewards">Premi</TabsTrigger>
          <TabsTrigger value="presets">Preset</TabsTrigger>
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
                action === "used" ? "Premio consegnato" : "Riscatto annullato",
                action === "cancel"
                  ? `${pointsLabel(redemption.cost)} tornati a ${redemption.playerName}.`
                  : undefined,
              )
            }
          />
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openReward(null)}>
              <Plus className="size-4" />
              Nuovo premio
            </Button>
          </div>

          <RewardsGrid
            rewards={rewards}
            pending={pending}
            onEdit={openReward}
            onArchive={(reward) =>
              void run(
                `reward-${reward.id}`,
                () =>
                  request(`/api/dashboard/points/rewards/${reward.id}`, {
                    method: "DELETE",
                  }),
                "Premio ritirato",
                "Non è più visibile ai clienti. Chi l'ha già riscattato lo tiene.",
              )
            }
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
            onArchive={(preset) =>
              void run(
                `preset-${preset.id}`,
                () =>
                  request(`/api/dashboard/points/presets/${preset.id}`, {
                    method: "DELETE",
                  }),
                "Preset rimosso",
              )
            }
          />
        </TabsContent>
      </Tabs>

      <RewardDialog
        open={dialogOpen}
        reward={editing}
        onOpenChange={setDialogOpen}
        onSaved={() => void load()}
      />
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
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          aria-label="Cerca per codice o nome"
          placeholder="Codice o nome"
          className="pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <ul className="divide-y rounded-xl border bg-card">
        {visible.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                <span className="font-mono tracking-wider">{row.code}</span>
                <span className="truncate">{row.title}</span>
                {row.state === "expired" && (
                  <Badge variant="outline" className="text-destructive">
                    Scaduto
                  </Badge>
                )}
              </p>
              <p className="text-muted-foreground mt-0.5 text-sm">
                <Link
                  href={`/dashboard/clients?client=${row.playerId}`}
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  {row.playerName}
                </Link>{" "}
                · riscattato il {format(row.createdAt, "d MMM", { locale: it })}
                {row.expiresAt
                  ? ` · ${row.state === "expired" ? "scaduto" : "scade"} il ${format(row.expiresAt, "d MMM yyyy", { locale: it })}`
                  : ""}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              {row.state === "active" && (
                <Button
                  size="sm"
                  disabled={pending !== null}
                  onClick={() => onClose(row, "used")}
                >
                  {pending === row.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Consegnato
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={pending !== null}
                onClick={() => onClose(row, "cancel")}
              >
                <Undo2 className="size-4" />
                Annulla
              </Button>
            </div>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="text-muted-foreground p-4 text-sm">
            Nessun riscatto con questo codice o nome.
          </li>
        )}
      </ul>
    </div>
  );
}

function RewardsGrid({
  rewards,
  pending,
  onEdit,
  onArchive,
}: {
  rewards: Reward[] | null;
  pending: string | null;
  onEdit: (reward: Reward) => void;
  onArchive: (reward: Reward) => void;
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
            Crea il primo: foto, titolo, costo in punti. I clienti lo vedono
            subito nella loro area personale, con quanti punti mancano.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rewards.map((reward) => (
        <li
          key={reward.id}
          className="bg-card flex flex-col overflow-hidden rounded-xl border"
        >
          {reward.imageUrl ? (
            // biome-ignore lint/performance/noImgElement: URL firmato di Convex, che next/image non conosce.
            <img
              src={reward.imageUrl}
              alt=""
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex aspect-[4/3] items-center justify-center">
              <Gift className="size-8" />
            </div>
          )}

          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{reward.title}</p>
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {pointsLabel(reward.cost)}
              </Badge>
            </div>
            <p className="text-muted-foreground line-clamp-3 text-sm">
              {reward.description}
            </p>
            <p className="text-muted-foreground text-xs">
              {reward.validityDays
                ? `Valido ${reward.validityDays} giorni dal riscatto`
                : "Senza scadenza"}
              {reward.pending > 0 ? ` · ${reward.pending} da consegnare` : ""}
            </p>

            <div className="mt-auto flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(reward)}
              >
                <Pencil className="size-4" />
                Modifica
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={pending !== null}
                onClick={() => onArchive(reward)}
              >
                {pending === `reward-${reward.id}` ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Ritira
              </Button>
            </div>
          </div>
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
}: {
  presets: Preset[] | null;
  pending: string | null;
  onSave: (preset: {
    presetId?: string;
    label: string;
    points: number;
  }) => void;
  onArchive: (preset: Preset) => void;
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
          />
        ))}
        {presets.length === 0 && (
          <li className="text-muted-foreground p-4 text-sm">
            Nessun preset: aggiungine uno qui sotto.
          </li>
        )}
      </ul>

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
    </div>
  );
}

function PresetRow({
  preset,
  busy,
  disabled,
  onSave,
  onArchive,
}: {
  preset: Preset;
  busy: boolean;
  disabled: boolean;
  onSave: (next: { label: string; points: number }) => void;
  onArchive: () => void;
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
            preset.points > 0 ? "text-emerald-600" : "text-destructive",
          )}
        >
          {signedPoints(preset.points)}
        </span>
        <span className="truncate">{preset.label}</span>
      </div>
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
