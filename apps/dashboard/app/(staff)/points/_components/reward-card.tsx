"use client";

import {
  CalendarClock,
  Gift,
  Loader2,
  PackageOpen,
  Pause,
  Pencil,
  Trash2,
  Infinity as Unlimited,
} from "lucide-react";

import { StatusBadge } from "@/app/_components/status-badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import type { Reward } from "./types";

/**
 * Un premio del catalogo, come lo vede lo staff.
 *
 * Prima la cosa che il cliente desidera: la foto grande, in una cornice
 * dentro la card. Poi il nome e il prezzo in punti, in cifre grandi: è il
 * numero che si confronta con il saldo, e va letto al volo. Sotto, in
 * pillole, quello che serve sapere senza aprire niente: la validità, quanti
 * ne vanno consegnati, se è in pausa.
 *
 * In fondo, separati dal resto, i gesti. «In vetrina» è l'interruttore di
 * tutti i giorni: reversibile, si tocca senza conferma. «Ritira» invece toglie
 * il premio per sempre: è un'icona in disparte e chiede conferma (lo fa chi
 * la usa, `points-panel.tsx`). Toccare la foto apre la modifica, come
 * aspetta chiunque abbia usato un catalogo.
 */
export function RewardCard({
  reward,
  toggling,
  archiving,
  disabled,
  onEdit,
  onToggle,
  onArchive,
}: {
  reward: Reward;
  /** L'interruttore di questa card sta salvando. */
  toggling: boolean;
  /** Questa card si sta ritirando: il cestino gira. */
  archiving: boolean;
  /** Un'altra operazione è in corso: si aspetta. */
  disabled: boolean;
  onEdit: () => void;
  onToggle: (disabled: boolean) => void;
  onArchive: () => void;
}) {
  const paused = reward.disabled;
  const switchId = `reward-available-${reward.id}`;

  return (
    <article className="group bg-card flex w-full flex-col rounded-2xl border p-1.5 transition-shadow duration-200 hover:shadow-[0_14px_36px_-18px_oklch(0.2_0_0/0.3)]">
      {/*
       * Il raggio della foto è quello della card meno il suo margine (16 - 6):
       * così le due curve restano parallele. In pausa la foto si spegne,
       * grigia e attenuata, con una dissolvenza breve: dice cosa è cambiato
       * senza distrarre.
       */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Modifica ${reward.title}`}
        className="focus-visible:ring-ring/50 relative block overflow-hidden rounded-[10px] outline-none focus-visible:ring-[3px]"
      >
        <div
          className={cn(
            "aspect-[4/3] transition-[opacity,filter] duration-200 ease-out",
            paused && "opacity-40 grayscale",
          )}
        >
          {reward.imageUrl ? (
            // biome-ignore lint/performance/noImgElement: URL firmato di Convex, che next/image non conosce.
            <img
              src={reward.imageUrl}
              alt=""
              className="size-full object-cover transition-transform duration-[250ms] ease-(--ease-out) group-hover:scale-[1.03]"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex size-full items-center justify-center">
              <Gift className="size-10" strokeWidth={1.5} />
            </div>
          )}
        </div>
      </button>

      <div className="flex flex-1 flex-col px-2.5 pt-3.5">
        <h3
          className={cn(
            "line-clamp-2 text-[15px] leading-snug font-semibold transition-colors duration-200",
            paused && "text-muted-foreground",
          )}
        >
          {reward.title}
        </h3>
        <p className="mt-1.5 flex items-baseline gap-1">
          <span className="text-[1.75rem] leading-none font-semibold tracking-[-0.02em] tabular-nums">
            {reward.cost}
          </span>
          <span className="text-muted-foreground text-sm">
            {reward.cost === 1 ? "punto" : "punti"}
          </span>
        </p>
        <p className="text-muted-foreground mt-2.5 line-clamp-2 text-sm leading-relaxed">
          {reward.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {paused && (
            <StatusBadge tone="neutral" icon={Pause}>
              In pausa
            </StatusBadge>
          )}
          {reward.pending > 0 && (
            <StatusBadge tone="warning" icon={PackageOpen}>
              {reward.pending} da consegnare
            </StatusBadge>
          )}
          <StatusBadge
            tone="neutral"
            icon={reward.validityDays ? CalendarClock : Unlimited}
          >
            {reward.validityDays
              ? `Valido ${reward.validityDays} giorni`
              : "Senza scadenza"}
          </StatusBadge>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-1 px-2.5 pt-3 pb-1">
        <div className="flex flex-1 items-center gap-1 border-t pt-2.5">
          {/* Tutta l'etichetta accende: non solo la levetta. */}
          <label
            htmlFor={switchId}
            className="flex min-h-10 flex-1 cursor-pointer items-center gap-2.5"
          >
            <Switch
              id={switchId}
              checked={!paused}
              disabled={disabled || toggling}
              onCheckedChange={(available) => onToggle(!available)}
            />
            <span className="text-sm">In vetrina</span>
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-full px-3"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
            Modifica
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Ritira ${reward.title}`}
            title="Ritira premio"
            className="text-muted-foreground hover:bg-danger-subtle hover:text-danger size-9 rounded-full"
            disabled={disabled}
            onClick={onArchive}
          >
            {archiving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
