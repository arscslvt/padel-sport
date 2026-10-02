"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { POINTS_TERMS_LINK } from "@/lib/links";
import { pointsLabel } from "@/lib/points";

/**
 * La richiesta di adesione al programma punti.
 *
 * Sta al posto del saldo finché il socio non accetta il regolamento: i punti
 * non arrivano a chi non li ha chiesti. La casella non è spuntata in partenza e
 * il bottone resta spento finché non la spunti tu: un consenso dato per
 * distrazione non è un consenso.
 *
 * Se il club gli ha già caricato dei punti, glielo diciamo: sono in attesa e
 * arrivano tutti insieme al momento dell'adesione.
 *
 * `outdated` è chi aveva aderito a una versione precedente: il saldo è suo e
 * glielo diciamo, ma per riceverne altri deve rileggere le regole nuove.
 */
export function JoinProgram({
  version,
  state,
  balance,
  pendingPoints,
}: {
  version: string;
  state: "none" | "outdated";
  balance: number;
  /** Punti già caricati dal club che arrivano aderendo. */
  pendingPoints: number;
}) {
  const accept = useMutation(api.modules.points.terms.accept);
  const checkboxId = useId();

  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const join = async () => {
    setLoading(true);
    try {
      const result = await accept({ version });
      toast.success(
        state === "none"
          ? "Benvenuto nel programma punti"
          : "Regolamento accettato",
        {
          description:
            result.points > 0
              ? `Ti abbiamo accreditato ${pointsLabel(result.points)} che ti aspettavano.`
              : "Da adesso i punti che guadagni in campo arrivano qui.",
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? (error.message.match(/Uncaught Error: (.*?)(?:\n| at )/)?.[1] ??
            "Riprova fra poco.")
          : "Riprova fra poco.";
      toast.error("Adesione non registrata", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="join-title"
      className="tone-ink rounded-card grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_minmax(0,22rem)] md:items-end lg:p-10"
    >
      <div>
        <h2
          id="join-title"
          className="font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.02em]"
        >
          {state === "none" ? (
            <>
              Gioca, accumula, <em className="italic">ritira</em>.
            </>
          ) : (
            <>
              Il regolamento è <em className="italic">cambiato</em>.
            </>
          )}
        </h2>
        {pendingPoints > 0 && (
          <p className="mt-4 text-sm font-medium text-emerald-400">
            Il club ti ha già assegnato {pointsLabel(pendingPoints)}: sono tuoi
            appena aderisci.
          </p>
        )}
        <p className="text-muted-foreground mt-4 max-w-[48ch] text-sm leading-relaxed">
          {state === "none"
            ? "Con il programma punti il club ti premia per le partite che giochi: i punti si accumulano qui e li cambi con i premi in segreteria. Aderire è gratuito e puoi uscire quando vuoi."
            : `I tuoi ${pointsLabel(balance)} restano tuoi. Per ricevere i nuovi e riscattare i premi, leggi la nuova versione e accettala.`}
        </p>
      </div>

      <div className="space-y-4">
        <label
          htmlFor={checkboxId}
          className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"
        >
          <Checkbox
            id={checkboxId}
            checked={checked}
            onCheckedChange={(value) => setChecked(Boolean(value))}
            className="mt-0.5"
          />
          <span>
            Ho letto e accetto il{" "}
            <Link
              href={POINTS_TERMS_LINK}
              target="_blank"
              className="underline underline-offset-4"
            >
              regolamento del programma punti
            </Link>
            .
          </span>
        </label>

        <Button
          size="pill"
          className="w-full active:scale-[0.98]"
          disabled={!checked || loading}
          onClick={() => void join()}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {state === "none" ? "Aderisci al programma" : "Accetta e continua"}
        </Button>
      </div>
    </section>
  );
}
