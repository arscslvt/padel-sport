"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { pointsLabel } from "@/lib/points";
import type { PointRule } from "./types";

/**
 * Le azioni che fanno guadagnare punti da sole.
 *
 * Quali sono lo decide il codice; qui si sceglie se sono accese e quanto
 * valgono. Cambiare i punti vale da adesso: chi li ha già ricevuti tiene
 * quelli di allora.
 */
export function RulesEditor({
  rules,
  pending,
  onSave,
  readOnly,
}: {
  rules: PointRule[] | null;
  pending: string | null;
  onSave: (rule: RuleChange) => void;
  readOnly: boolean;
}) {
  if (!rules) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-muted-foreground text-sm">
        I punti che i clienti ricevono da soli, senza che nessuno li carichi. Se
        la prenotazione che li ha fatti guadagnare viene annullata, tornano
        indietro.
        {readOnly && " Le accende e le cambia un amministratore."}
      </p>

      <ul className="divide-y rounded-xl border bg-card">
        {rules.map((rule) => (
          <RuleRow
            key={rule.key}
            rule={rule}
            busy={pending === `rule-${rule.key}`}
            disabled={pending !== null}
            onSave={onSave}
            readOnly={readOnly}
          />
        ))}
      </ul>
    </div>
  );
}

/** Quel che si salva di un'azione. */
type RuleChange = Pick<
  PointRule,
  "key" | "points" | "friendPoints" | "enabled"
>;

const validPoints = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= 1000;

function RuleRow({
  rule,
  busy,
  disabled,
  onSave,
  readOnly,
}: {
  rule: PointRule;
  busy: boolean;
  disabled: boolean;
  onSave: (rule: RuleChange) => void;
  readOnly: boolean;
}) {
  const [points, setPoints] = useState(String(rule.points));
  const [friendPoints, setFriendPoints] = useState(
    rule.friendPoints === undefined ? "" : String(rule.friendPoints),
  );
  // «Amico invitato» ha due valori, uno per chi invita e uno per l'amico, ma
  // un solo interruttore: si accendono e si spengono insieme.
  const paired = rule.friendPoints !== undefined;
  const changed =
    Number(points) !== rule.points ||
    (paired && Number(friendPoints) !== rule.friendPoints);

  const save = (next: { enabled?: boolean } = {}) => {
    const value = Number(points);
    const friend = paired ? Number(friendPoints) : undefined;
    if (!validPoints(value) || (friend !== undefined && !validPoints(friend))) {
      toast.error("I punti sono un numero intero da 1 a 1000.");
      return;
    }
    onSave({
      key: rule.key,
      points: value,
      friendPoints: friend,
      enabled: next.enabled ?? rule.enabled,
    });
  };

  const field = (
    label: string,
    value: string,
    onChange: (value: string) => void,
  ) => (
    <div className="flex items-center gap-2">
      <Input
        aria-label={`Punti ${label}`}
        type="number"
        inputMode="numeric"
        min={1}
        max={1000}
        step={1}
        className="w-24"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="text-muted-foreground text-sm">punti {label}</span>
    </div>
  );

  return (
    <li className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{rule.label}</p>
          <p className="text-muted-foreground text-sm">{rule.description}</p>
        </div>
        <Switch
          aria-label={
            rule.enabled ? `Spegni ${rule.label}` : `Accendi ${rule.label}`
          }
          checked={rule.enabled}
          disabled={readOnly || disabled}
          onCheckedChange={(enabled) => save({ enabled })}
          className="mt-1"
        />
      </div>

      {readOnly ? (
        <p className="text-sm">
          <span className="font-mono font-medium tabular-nums">
            {pointsLabel(rule.points)}
          </span>
          {paired && (
            <>
              {" "}
              a chi invita ·{" "}
              <span className="font-mono font-medium tabular-nums">
                {pointsLabel(rule.friendPoints ?? 0)}
              </span>{" "}
              all&apos;amico
            </>
          )}
          {!rule.enabled && (
            <span className="text-muted-foreground"> · spenta</span>
          )}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {field(paired ? "a chi invita" : "", points, setPoints)}
          {paired && field("all'amico", friendPoints, setFriendPoints)}
          {changed && (
            <Button size="sm" disabled={disabled} onClick={() => save()}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Salva
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
