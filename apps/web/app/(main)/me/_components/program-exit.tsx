"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { convexMessage } from "@/lib/clients";
import { POINTS_TERMS_LINK } from "@/lib/links";
import { formatClubDate, pointsLabel } from "@/lib/points";

import { SectionTitle } from "./section-title";
import type { Wallet } from "./types";

/**
 * L'uscita dal programma punti, dal lato del socio.
 *
 * Si esce da qui o dal link che la segreteria manda via mail: in entrambi i
 * casi è la persona a confermare, dopo aver letto cosa succede ai suoi punti
 * (packages/backend/convex/modules/points/exit.ts). Per dieci giorni può
 * ancora riscattarli, o ripensarci e restare.
 */

/** Dieci giorni per riscattare: è la regola del regolamento, sezione 8. */
const EXIT_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

/** In fondo alla pagina dei punti: l'uscita c'è, ma non è la prima cosa. */
export function LeaveProgram({ wallet }: { wallet: Wallet }) {
  const leave = useMutation(api.modules.points.exit.leave);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Una stima per la conferma: la data vera la fissa il backend.
  const deadline = formatClubDate(Date.now() + EXIT_WINDOW_MS);

  const confirm = async () => {
    setLoading(true);
    try {
      const result = await leave({});
      setOpen(false);
      toast.success("Sei uscito dal programma", {
        description:
          result.balance > 0
            ? `Puoi riscattare i tuoi punti fino al ${formatClubDate(result.deadline)}.`
            : "Puoi aderire di nuovo quando vuoi.",
      });
    } catch (error) {
      toast.error("Uscita non registrata", {
        description: convexMessage(error, "Riprova fra poco."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="leave-title" className="space-y-5">
      <SectionTitle
        id="leave-title"
        title="Programma punti"
        description="Puoi uscire quando vuoi. Dopo hai 10 giorni per riscattare i punti che hai."
        action={
          <Button variant="outline" size="pill" onClick={() => setOpen(true)}>
            Esci dal programma
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-normal tracking-[-0.02em]">
              Vuoi uscire dal programma?
            </DialogTitle>
            <DialogDescription>
              Leggi cosa succede ai tuoi punti prima di confermare.
            </DialogDescription>
          </DialogHeader>

          <ExitRules balance={wallet.balance} deadline={deadline} />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" size="pill" onClick={() => setOpen(false)}>
              Resto nel programma
            </Button>
            <Button
              variant="destructive"
              size="pill"
              className="active:scale-[0.98]"
              disabled={loading}
              onClick={() => void confirm()}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Esci dal programma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/**
 * Le regole dell'uscita, uguali qui e sulla pagina del link della mail
 * (app/(main)/points-exit/[token]).
 */
export function ExitRules({
  balance,
  deadline,
}: {
  balance: number;
  /** Fino a quando si riscatta, già scritto per esteso. */
  deadline: string;
}) {
  return (
    <ul className="bg-muted rounded-card text-muted-foreground list-disc space-y-2 py-5 pr-5 pl-9 text-sm leading-relaxed">
      <li>Da adesso non ricevi più punti nuovi.</li>
      {balance > 0 ? (
        <li>
          I tuoi{" "}
          <strong className="text-foreground font-medium">
            {pointsLabel(balance)}
          </strong>{" "}
          restano tuoi fino al {deadline}. Fino ad allora puoi riscattarli in
          premi dalla tua area personale. Poi i punti non usati decadono.
        </li>
      ) : (
        <li>Non hai punti da riscattare.</li>
      )}
      <li>I premi già riscattati restano validi fino alla loro scadenza.</li>
      <li>Puoi aderire di nuovo quando vuoi. I punti decaduti non tornano.</li>
      <li>
        Tutte le regole sono nel{" "}
        <Link
          href={POINTS_TERMS_LINK}
          target="_blank"
          className="text-foreground underline underline-offset-2"
        >
          regolamento del programma punti
        </Link>
        .
      </li>
    </ul>
  );
}

/** In cima alla pagina dei punti, finché l'uscita non è definitiva. */
export function LeavingNotice({ wallet }: { wallet: Wallet }) {
  const stay = useMutation(api.modules.points.exit.stay);
  const [loading, setLoading] = useState(false);

  const deadline = wallet.program.exitDeadline
    ? formatClubDate(wallet.program.exitDeadline)
    : null;

  const confirm = async () => {
    setLoading(true);
    try {
      const result = await stay({});
      toast.success("Sei di nuovo nel programma", {
        description:
          result.points > 0
            ? `Ti abbiamo accreditato ${pointsLabel(result.points)} che ti aspettavano.`
            : "Da adesso i punti che guadagni in campo arrivano di nuovo qui.",
      });
    } catch (error) {
      toast.error("Uscita non annullata", {
        description: convexMessage(error, "Riprova fra poco."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="leaving-title"
      className="rounded-card border-border space-y-4 border p-6 sm:p-8"
    >
      <div>
        <h2 id="leaving-title" className="text-base font-medium">
          Stai uscendo dal programma punti
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-[52ch] text-sm leading-relaxed">
          {wallet.balance > 0
            ? `Puoi riscattare i tuoi ${pointsLabel(wallet.balance)} fino al ${deadline}. Poi i punti non usati decadono.`
            : `Il ${deadline} l'uscita diventa definitiva.`}{" "}
          Se ci hai ripensato, puoi restare.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {wallet.balance > 0 && (
          <Button asChild size="pill">
            <Link href="/me/premi">Vai ai premi</Link>
          </Button>
        )}
        <Button
          variant="outline"
          size="pill"
          disabled={loading}
          onClick={() => void confirm()}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Resta nel programma
        </Button>
      </div>
    </section>
  );
}
