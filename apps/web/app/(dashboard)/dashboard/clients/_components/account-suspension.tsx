"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Ban, Loader2, LockOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SheetHeader } from "@/app/(dashboard)/_components/sheet-header";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
} from "@/components/ui/responsive-drawer";
import { Textarea } from "@/components/ui/textarea";

import type { ClientDetail } from "./types";

/** Lo stesso minimo della route: sotto, il cliente leggerebbe un'etichetta. */
const REASON_MIN = 10;
const REASON_MAX = 1000;

/**
 * Sospensione dell'account, dentro la linguetta Account.
 *
 * Il motivo è obbligatorio perché finisce nella mail al cliente: chi lo scrive
 * deve saperlo mentre lo scrive, non scoprirlo dopo. Per questo la modale
 * elenca anche cosa succede — accesso chiuso, punti fermi, premi consegnati —
 * con le stesse parole che leggerà lui.
 */
export function AccountSuspension({
  client,
  disabled,
  onChanged,
}: {
  client: ClientDetail;
  disabled: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);

  const suspension = client.suspension;
  const trimmed = reason.trim();

  const suspend = async () => {
    setWorking(true);
    try {
      const response = await fetch(
        `/api/dashboard/clients/${client.id}/suspension`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: trimmed }),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Account non sospeso", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast[payload?.mailed ? "success" : "warning"]("Account sospeso", {
        description: payload?.mailed
          ? "Il cliente ha ricevuto la mail con il motivo."
          : "La mail non è partita: avvisa tu il cliente.",
      });

      setOpen(false);
      setReason("");
      await onChanged();
    } catch {
      toast.error("Account non sospeso", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setWorking(false);
    }
  };

  const reactivate = async () => {
    setWorking(true);
    try {
      const response = await fetch(
        `/api/dashboard/clients/${client.id}/suspension`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Account non riattivato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast[payload?.mailed ? "success" : "warning"]("Account riattivato", {
        description: payload?.mailed
          ? "Il cliente può di nuovo accedere, e gliel'abbiamo scritto."
          : "Il cliente può di nuovo accedere, ma la mail non è partita.",
      });

      await onChanged();
    } catch {
      toast.error("Account non riattivato", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setWorking(false);
    }
  };

  /**
   * Riattivare riapre l'accesso e manda una mail: un clic di troppo non si
   * ritira. Stessa conferma di «Elimina questa scheda».
   */
  const confirmReactivate = () => {
    toast("Riattivare questo account?", {
      description: (
        <>
          <span className="font-medium">{client.name}</span> potrà di nuovo
          accedere e usare i suoi punti, e riceverà una mail che glielo dice.
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => toast.dismiss()}
            >
              Annulla
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                toast.dismiss();
                void reactivate();
              }}
            >
              <LockOpen className="size-4" />
              Riattiva
            </Button>
          </div>
        </>
      ),
      duration: Number.POSITIVE_INFINITY,
    });
  };

  if (suspension) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950">
          <Ban className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 space-y-1.5">
            <p className="font-medium">
              Account sospeso dal{" "}
              {format(suspension.suspendedAt, "d MMMM yyyy", { locale: it })}
            </p>
            <p className="text-xs leading-relaxed whitespace-pre-wrap">
              {suspension.reason}
            </p>
            <p className="text-xs text-red-900/80">
              Non accede né dal sito né dall'app.{" "}
              {client.points > 0
                ? `I suoi ${client.points} punti sono congelati.`
                : "Il suo conto punti è congelato."}{" "}
              I premi già riscattati si consegnano lo stesso.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={confirmReactivate}
          disabled={disabled || working}
        >
          {working ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LockOpen className="size-4" />
          )}
          Riattiva account
        </Button>
        <p className="text-muted-foreground text-xs">
          Riapre l'accesso e scongela i punti. Il cliente riceve una mail.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t pt-4">
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Ban className="size-4" />
        Sospendi account
      </Button>

      <ResponsiveDrawer open={open} setOpen={setOpen}>
        <ResponsiveDrawerContent className="sm:max-w-lg">
          <SheetHeader
            title="Sospendi account"
            description={`${client.name} riceverà una mail con il motivo e con i recapiti del club per un eventuale reclamo.`}
          />

          <div className="space-y-4 px-4 md:px-0">
            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              <li>Non potrà più accedere né prenotare dal sito e dall'app.</li>
              <li>
                {client.points > 0
                  ? `I suoi ${client.points} punti restano suoi ma vengono congelati: niente carichi né riscatti.`
                  : "Il conto punti viene congelato: niente carichi né riscatti."}
              </li>
              <li>I premi che ha già riscattato gli verranno consegnati.</li>
            </ul>

            <div className="space-y-1.5">
              <Label htmlFor="suspension-reason">Motivo</Label>
              <Textarea
                id="suspension-reason"
                value={reason}
                maxLength={REASON_MAX}
                rows={4}
                placeholder="Es. mancato pagamento di due prenotazioni a settembre."
                onChange={(event) => setReason(event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Il cliente lo legge così com'è: scrivilo per lui.
              </p>
            </div>
          </div>

          <ResponsiveDrawerFooter className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => void suspend()}
              disabled={working || trimmed.length < REASON_MIN}
            >
              {working ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Ban className="size-4" />
              )}
              Sospendi e avvisa
            </Button>
          </ResponsiveDrawerFooter>
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>
    </div>
  );
}
