"use client";

import { differenceInCalendarDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { Check, Gift, Loader2 } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/app/_components/status-badge";
import { Button } from "@/components/ui/button";

import type { PendingRedemption } from "./types";

/**
 * Un premio da consegnare, come lo usa lo staff allo sportello.
 *
 * La gerarchia segue i gesti: prima *cosa* consegnare (la foto e il nome del
 * premio, la cosa più grande), poi il *codice* da confrontare con quello sul
 * telefono del cliente (in un riquadro suo, monospaziato e spaziato, così si
 * legge carattere per carattere e non si confonde con il nome), poi *di chi*
 * è e da quando, infine le due risposte a tutta larghezza.
 *
 * La scadenza è uno stato e non una nota: ambra quando mancano pochi giorni,
 * rossa quando è passata — e allora resta solo da annullare, che restituisce
 * i punti.
 */

/** Sotto questa soglia la scadenza va guardata, non solo letta. */
const EXPIRING_DAYS = 3;

export function RedemptionCard({
  redemption,
  busy,
  disabled,
  onDeliver,
  onCancel,
}: {
  redemption: PendingRedemption;
  /** È lei quella in lavorazione: il suo pulsante gira. */
  busy: boolean;
  /** Un'altra è in lavorazione: si aspetta. */
  disabled: boolean;
  onDeliver: () => void;
  onCancel: () => void;
}) {
  const expired = redemption.state === "expired";
  const daysLeft = redemption.expiresAt
    ? differenceInCalendarDays(redemption.expiresAt, Date.now())
    : null;

  return (
    <article className="bg-card flex flex-col rounded-2xl border">
      <div className="flex gap-3.5 p-4 pb-3">
        <div className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl">
          {redemption.imageUrl ? (
            // biome-ignore lint/performance/noImgElement: URL firmato di Convex, che next/image non conosce.
            <img
              src={redemption.imageUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <Gift className="text-muted-foreground size-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold">
            {redemption.title}
          </h3>
          <Link
            href={`/clients?client=${redemption.playerId}`}
            className="text-muted-foreground hover:text-foreground mt-0.5 block truncate text-[13px] underline-offset-2 hover:underline"
          >
            {redemption.playerName}
          </Link>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {redemption.cost} punti, il{" "}
            {format(redemption.createdAt, "d MMM", { locale: it })}
          </p>
        </div>
      </div>

      <div className="bg-muted/60 mx-4 flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5">
        <span className="text-muted-foreground text-xs">Codice di ritiro</span>
        <span className="font-mono text-lg leading-none font-semibold tracking-[0.18em]">
          {redemption.code}
        </span>
      </div>

      {redemption.expiresAt && (
        <div className="px-4 pt-3">
          {expired ? (
            <StatusBadge tone="danger">
              Scaduto il {format(redemption.expiresAt, "d MMM", { locale: it })}
            </StatusBadge>
          ) : daysLeft !== null && daysLeft <= EXPIRING_DAYS ? (
            <StatusBadge tone="warning">
              {daysLeft <= 0
                ? "Scade oggi"
                : daysLeft === 1
                  ? "Scade domani"
                  : `Scade fra ${daysLeft} giorni`}
            </StatusBadge>
          ) : (
            <span className="text-muted-foreground text-xs">
              Da ritirare entro il{" "}
              {format(redemption.expiresAt, "d MMMM", { locale: it })}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 p-4 pt-3">
        <Button
          variant="outline"
          className={expired ? "col-span-2 h-11 rounded-xl" : "h-11 rounded-xl"}
          disabled={disabled}
          onClick={onCancel}
        >
          {expired ? "Annulla e restituisci i punti" : "Annulla"}
        </Button>
        {!expired && (
          <Button
            className="h-11 rounded-xl"
            disabled={disabled}
            onClick={onDeliver}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Consegna
          </Button>
        )}
      </div>
    </article>
  );
}
