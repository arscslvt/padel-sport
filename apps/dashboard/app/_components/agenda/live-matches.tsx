"use client";

import { useEffect, useState } from "react";

import { LevelBars } from "@/components/level-bars";
import { MATCH_DURATION_MS } from "@/lib/booking";
import { cn } from "@/lib/utils";

import {
  type Booking,
  clubTime,
  courtLabel,
  isQuadrangolare,
  LEVEL_BARS,
  LEVEL_LABELS,
  playersLabel,
} from "./lib";

/**
 * Le partite che si stanno giocando adesso, in cima alla giornata di oggi.
 *
 * Sono l'unica cosa dell'agenda che cambia mentre la si guarda, e per questo
 * hanno una forma loro: una scheda tinta di verde, il punto che pulsa, e la
 * barra del tempo che si riempie da sola. La domanda a cui rispondono è quella
 * dello sportello, «quando si libera il campo?»: i minuti che mancano stanno
 * grandi a destra, il campo in alto. Un tocco apre la scheda come ogni riga.
 */

/** Ogni quanto si ridisegna: la barra e i minuti si muovono a scatti di mezzo minuto. */
const TICK_MS = 30_000;

/**
 * Adesso, aggiornato a intervalli: senza, la barra resterebbe ferma e una
 * partita finita non passerebbe fra le concluse.
 */
export function useNow(interval = TICK_MS): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(timer);
  }, [interval]);
  return now;
}

/** Iniziata e non ancora finita, confermata: quella da mostrare qui. */
export function isLive(booking: Booking, now: number): boolean {
  return (
    booking.status === "accepted_on_site_payment" &&
    booking.bookingDate <= now &&
    now < booking.bookingDate + MATCH_DURATION_MS
  );
}

/** Finita: l'orario di fine è passato. */
export function isConcluded(booking: Booking, now: number): boolean {
  return booking.bookingDate + MATCH_DURATION_MS <= now;
}

/** Il punto «in diretta»: fermo per chi ha chiesto meno animazioni. */
function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative flex size-2.5", className)}>
      <span className="live-ping bg-success absolute inset-0 rounded-full" />
      <span className="bg-success relative size-2.5 rounded-full" />
    </span>
  );
}

export function LiveMatches({
  live,
  now,
  courtNames,
  onOpen,
}: {
  /** Già scelte con `isLive`. */
  live: Booking[];
  now: number;
  courtNames: ReadonlyMap<string, string>;
  onOpen: (booking: Booking) => void;
}) {
  if (live.length === 0) return null;

  return (
    <section aria-label="Partite in corso" className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <LiveDot />
        <h2 className="text-success-foreground text-[13px] font-semibold">
          In corso
        </h2>
        {live.length > 1 && (
          <span className="text-muted-foreground text-[13px] tabular-nums">
            {live.length}
          </span>
        )}
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {live.map((booking) => (
          <LiveCard
            key={booking._id}
            booking={booking}
            court={courtLabel(booking, courtNames)}
            now={now}
            onOpen={() => onOpen(booking)}
          />
        ))}
      </div>
    </section>
  );
}

function LiveCard({
  booking,
  court,
  now,
  onOpen,
}: {
  booking: Booking;
  court?: string;
  now: number;
  onOpen: () => void;
}) {
  const end = booking.bookingDate + MATCH_DURATION_MS;
  const elapsed = Math.min(
    1,
    Math.max(0, (now - booking.bookingDate) / MATCH_DURATION_MS),
  );
  // Per eccesso: a 20 secondi dalla fine manca ancora «1 minuto», non zero.
  const remaining = Math.max(1, Math.ceil((end - now) / 60_000));

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group border-success-border bg-success-subtle relative w-full overflow-hidden rounded-2xl border p-4 text-left outline-none",
        "transition-transform duration-150 ease-out active:scale-[0.99] motion-reduce:transform-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
      )}
    >
      {/* Un alone dall'angolo dei minuti: la scheda «accesa», non solo tinta. */}
      <span
        aria-hidden
        className="bg-success/15 pointer-events-none absolute -top-16 -right-12 size-44 rounded-full blur-2xl transition-opacity md:group-hover:opacity-70"
      />

      <span className="relative flex items-start gap-4">
        <span className="min-w-0 flex-1">
          <span className="text-success-foreground block truncate text-[13px] font-semibold">
            {court ?? "Campo da assegnare"}
            {isQuadrangolare(booking) && (
              <span className="font-normal"> · Quadrangolare</span>
            )}
          </span>
          <span className="mt-1 line-clamp-2 text-[17px] leading-snug font-semibold">
            {playersLabel(booking)}
          </span>
          <span className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-[13px]">
            <LevelBars filled={LEVEL_BARS[booking.level]} />
            {LEVEL_LABELS[booking.level]}
          </span>
        </span>

        {/* Quando si libera il campo: la domanda dello sportello. */}
        <span className="shrink-0 text-right">
          <span className="block text-[34px] leading-none font-semibold tracking-tight tabular-nums">
            {remaining}
          </span>
          <span className="text-muted-foreground mt-1 block text-xs">
            {remaining === 1 ? "minuto" : "minuti"}
          </span>
        </span>
      </span>

      {/* Il tempo giocato: si riempie da sé, e il riflesso dice che è vivo. */}
      <span className="relative mt-4 block">
        <span
          role="progressbar"
          aria-label="Tempo di gioco trascorso"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(elapsed * 100)}
          className="bg-success/15 relative block h-1.5 overflow-hidden rounded-full"
        >
          <span
            className="bg-success absolute inset-y-0 left-0 overflow-hidden rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.max(elapsed * 100, 3)}%` }}
          >
            <span className="live-sweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </span>
        </span>
        <span className="text-muted-foreground mt-1.5 flex justify-between text-xs tabular-nums">
          <span>{clubTime(booking.bookingDate)}</span>
          <span>finisce alle {clubTime(end)}</span>
        </span>
      </span>
    </button>
  );
}
