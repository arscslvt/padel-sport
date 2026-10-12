"use client";

import type { Doc } from "@padel-sport/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowLeftRight, CheckCircle2, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { MAX_PLAYERS } from "@/lib/booking";
import { type MergePair, mergeablePairs } from "@/lib/booking-merge";
import { cn } from "@/lib/utils";

import { useConfirm } from "../_providers/confirm.provider";

/**
 * Le coppie di prenotazioni parziali che si possono chiudere in un campo solo.
 *
 * Sta in un file suo perché è un modo diverso di guardare le stesse
 * prenotazioni: non una richiesta da approvare, ma due che insieme risolvono
 * un problema — quattro giocatori che aspettano e un campo occupato per metà.
 */

type Booking = Doc<"bookings">;

const levelLabels: Record<Booking["level"], string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzato: "Avanzato",
};

function GroupColumn({
  booking,
  courtName,
  freed,
}: {
  booking: Booking;
  courtName?: string;
  freed?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1.5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="truncate text-sm font-semibold">{booking.bookedBy}</h4>
        <Badge variant="outline" className="bg-card font-normal">
          {levelLabels[booking.level]}
        </Badge>
      </div>

      <p className="text-muted-foreground text-xs">
        {courtName ?? "Campo da assegnare"}
        {freed && " · si libera"} · {booking.players.length}{" "}
        {booking.players.length === 1 ? "giocatore" : "giocatori"}
      </p>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {/* La posizione e non il nome: in una squadra ci possono essere due
            omonimi. */}
        {booking.players.map((player, index) => (
          <Badge
            key={`${index}-${player}`}
            variant="outline"
            className="bg-card font-normal"
          >
            {player}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function PairCard({
  pair,
  courtNames,
  onMerge,
  busy,
}: {
  pair: MergePair;
  courtNames: Map<string, string>;
  onMerge: (pair: MergePair) => void;
  busy: boolean;
}) {
  const { keep, move, suggested, players } = pair;
  const freedCourt = courtNames.get(move.slot);
  const full = players === MAX_PLAYERS;

  return (
    <article
      className={cn(
        "bg-card rounded-2xl border",
        suggested && "border-info-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <span className="text-sm font-medium capitalize">
          {format(keep.bookingDate, "EEEE d MMMM, HH:mm", { locale: it })}
        </span>
        {suggested ? (
          <Badge className="border-info-border bg-info-subtle text-info-foreground">
            <Sparkles className="size-3.5" />
            Stesso livello
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-card font-normal">
            Livelli diversi
          </Badge>
        )}
      </div>

      <div className="flex flex-col divide-y sm:flex-row sm:divide-x sm:divide-y-0">
        <GroupColumn booking={keep} courtName={courtNames.get(keep.slot)} />
        <GroupColumn booking={move} courtName={freedCourt} freed />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Users className="size-4" />
          <span className={cn(full && "text-foreground font-medium")}>
            {players}/{MAX_PLAYERS} giocatori
          </span>
          {freedCourt && <span>· si libera {freedCourt}</span>}
        </p>

        <Button onClick={() => onMerge(pair)} disabled={busy}>
          <ArrowLeftRight className="size-4" />
          Unisci
        </Button>
      </div>
    </article>
  );
}

export default function MergePairs({
  bookings,
  courts,
  onMerged,
}: {
  bookings: readonly Booking[];
  courts: { id: string; name: string }[];
  /** L'agenda non è più reattiva: dopo un'unione va richiesta di nuovo. */
  onMerged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const ask = useConfirm();

  const pairs = useMemo(() => mergeablePairs(bookings), [bookings]);
  const courtNames = useMemo(
    () => new Map(courts.map((court) => [court.id, court.name])),
    [courts],
  );

  const merge = async (pair: MergePair) => {
    setBusy(true);
    try {
      const response = await fetch("/api/dashboard/bookings/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId: pair.keep._id, moveId: pair.move._id }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Prenotazioni non unite", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Campo completato", {
        description: `${pair.keep.bookedBy} e ${pair.move.bookedBy} giocheranno insieme. Le mail sono partite e il campo liberato torna prenotabile.`,
      });

      onMerged();
    } catch {
      toast.error("Prenotazioni non unite", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setBusy(false);
    }
  };

  /**
   * La conferma dice cosa succede davvero: due clienti ricevono una mail e un
   * campo cambia stato. Non è un'azione da fare per sbaglio con un click.
   */
  const confirm = async (pair: MergePair) => {
    const result = await ask({
      title: "Unire le due prenotazioni?",
      description: (
        <>
          <span className="text-foreground font-medium">
            {pair.keep.bookedBy}
          </span>{" "}
          e{" "}
          <span className="text-foreground font-medium">
            {pair.move.bookedBy}
          </span>{" "}
          giocheranno nello stesso campo, in {pair.players}. Entrambi ricevono
          una mail con i nomi degli altri giocatori.
          {!pair.suggested && (
            <span className="text-warning-foreground mt-2 block">
              Hanno dichiarato livelli diversi: valuta se avvisarli prima.
            </span>
          )}
        </>
      ),
      confirmLabel: "Unisci",
    });

    if (result) void merge(pair);
  };

  if (pairs.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle2 className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Nessuna coppia da completare</EmptyTitle>
          <EmptyDescription>
            Compariranno qui due prenotazioni dello stesso orario che insieme
            stanno in un campo solo.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {pairs.map((pair) => (
        <PairCard
          key={`${pair.keep._id}-${pair.move._id}`}
          pair={pair}
          courtNames={courtNames}
          onMerge={(next) => void confirm(next)}
          busy={busy}
        />
      ))}
    </div>
  );
}
