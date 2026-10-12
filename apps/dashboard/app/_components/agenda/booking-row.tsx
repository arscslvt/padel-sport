"use client";

import { BellOff, Loader2, Users } from "lucide-react";

import { StatusBadge } from "@/app/_components/status-badge";
import { Button } from "@/components/ui/button";
import { MATCH_DURATION_MS, MAX_PLAYERS } from "@/lib/booking";
import { cn } from "@/lib/utils";

import {
  type Booking,
  clientReach,
  clubTime,
  dayKey,
  isCancelled,
  isPartial,
  isPending,
  LEVEL_LABELS,
  shortDayLabel,
  timeRange,
  totalPrice,
} from "./lib";

/**
 * Una partita nella giornata.
 *
 * L'ora sta in colonna a sinistra, grande, perché è la prima cosa che si
 * cerca: «chi gioca alle 18:30?». Lo stato compare solo quando c'è qualcosa
 * da dire — da confermare, annullata — e una partita confermata è una riga
 * pulita. Il tocco apre il dettaglio.
 *
 * Accanto al nome, la campanella barrata dice che nessun avviso è arrivato a
 * chi ha prenotato: è il caso in cui allo sportello conviene una telefonata.
 */
export function BookingRow({
  booking,
  court,
  onOpen,
}: {
  booking: Booking;
  court?: string;
  onOpen: () => void;
}) {
  const cancelled = isCancelled(booking);
  const partial = isPartial(booking) && !cancelled;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors outline-none active:bg-muted/80 focus-visible:bg-muted/60 md:hover:bg-muted/50",
        cancelled && "opacity-60",
      )}
    >
      <span className="w-12 shrink-0 text-right">
        <span
          className={cn(
            "block text-[15px] font-semibold tabular-nums",
            cancelled && "line-through",
          )}
        >
          {clubTime(booking.bookingDate)}
        </span>
        <span className="text-muted-foreground block text-xs tabular-nums">
          {clubTime(booking.bookingDate + MATCH_DURATION_MS)}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-medium">
            {booking.bookedBy}
          </span>
          {booking.mergedWith && (
            <Users
              aria-label="Campo condiviso"
              className="text-info size-4 shrink-0"
            />
          )}
          {clientReach(booking) === "unreached" && (
            <BellOff
              aria-label="Cliente non avvisato"
              className="text-danger size-4 shrink-0"
            />
          )}
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate text-[13px]">
          {[
            court,
            `${booking.players.length}/${MAX_PLAYERS}`,
            LEVEL_LABELS[booking.level],
          ]
            .filter(Boolean)
            .join(" · ")}
          {partial && (
            <span className="text-warning-foreground"> · cerca giocatori</span>
          )}
        </span>
      </span>

      {isPending(booking) ? (
        <StatusBadge tone="warning">Da confermare</StatusBadge>
      ) : cancelled ? (
        <StatusBadge tone="danger">Annullata</StatusBadge>
      ) : (
        <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
          {totalPrice(booking)} €
        </span>
      )}
    </button>
  );
}

/**
 * Una prenotazione che aspetta lo staff, con le due risposte a portata di
 * pollice: è il gesto più frequente della dashboard e non deve costare più
 * di due tocchi (il secondo è la conferma).
 */
export function PendingCard({
  booking,
  court,
  busy,
  onOpen,
  onAccept,
  onReject,
}: {
  booking: Booking;
  court?: string;
  busy: boolean;
  onOpen: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <article className="bg-card rounded-2xl border">
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-t-2xl px-4 pt-3.5 pb-3 text-left outline-none focus-visible:bg-muted/60"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-[15px] font-semibold">
            {booking.bookedBy}
          </span>
          <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
            {totalPrice(booking)} €
          </span>
        </span>
        <span className="mt-1 block text-sm">
          {shortDayLabel(dayKey(booking.bookingDate))},{" "}
          <span className="tabular-nums">{timeRange(booking.bookingDate)}</span>
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate text-[13px]">
          {[
            court,
            `${booking.players.length} ${booking.players.length === 1 ? "giocatore" : "giocatori"}`,
            LEVEL_LABELS[booking.level],
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <Button
          variant="outline"
          className="h-11 rounded-xl"
          disabled={busy}
          onClick={onReject}
        >
          Rifiuta
        </Button>
        <Button className="h-11 rounded-xl" disabled={busy} onClick={onAccept}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Conferma
        </Button>
      </div>
    </article>
  );
}
