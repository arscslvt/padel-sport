"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
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
import { formatClubDate } from "@/lib/points";

/**
 * L'eliminazione dell'account, dal lato della persona.
 *
 * È la cancellazione controllata (packages/backend/convex/modules/clients/
 * deletion.ts): trenta giorni in cui l'account funziona come sempre e la
 * richiesta si annulla da qui, poi diventa effettiva da sola. Lo stesso
 * avviso compare se a chiederla è stato il club.
 */

/** Trenta giorni: la data vera la fissa il backend, questa è per la conferma. */
const GRACE_MS = 30 * 24 * 60 * 60 * 1000;

/** In cima al profilo, finché la richiesta è in corso. */
export function DeletionNotice() {
  const pending = useQuery(api.modules.clients.deletion.mine, {});
  const cancel = useMutation(api.modules.clients.deletion.cancelMine);
  const [loading, setLoading] = useState(false);

  if (!pending) return null;

  const confirm = async () => {
    setLoading(true);
    try {
      await cancel({});
      toast.success("Eliminazione annullata", {
        description: "Il tuo account resta com'è.",
      });
    } catch (error) {
      toast.error("Eliminazione non annullata", {
        description: convexMessage(error, "Riprova fra poco."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="deletion-notice-title"
      className="rounded-card border-destructive/30 bg-destructive/5 space-y-4 border p-6 sm:p-8"
    >
      <div>
        <h2 id="deletion-notice-title" className="text-base font-medium">
          Il tuo account verrà eliminato il{" "}
          {formatClubDate(pending.effectiveAt)}
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-[52ch] text-sm leading-relaxed">
          {pending.requestedBy === "self"
            ? "L'hai chiesto tu."
            : "L'ha chiesto il club."}{" "}
          Fino ad allora funziona come sempre. Se ci hai ripensato, puoi
          tenerlo.
        </p>
      </div>
      <Button
        size="pill"
        className="active:scale-[0.98]"
        disabled={loading}
        onClick={() => void confirm()}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        Tieni il mio account
      </Button>
    </section>
  );
}

/** In fondo al profilo: c'è, ma non è la prima cosa. */
export function DeleteAccount() {
  const pending = useQuery(api.modules.clients.deletion.mine, {});
  const request = useMutation(api.modules.clients.deletion.requestMine);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Con la richiesta già in corso basta l'avviso in cima.
  if (pending !== null) return null;

  const deadline = formatClubDate(Date.now() + GRACE_MS);

  const confirm = async () => {
    setLoading(true);
    try {
      const result = await request({});
      setOpen(false);
      toast.success("Richiesta ricevuta", {
        description: `Il tuo account verrà eliminato il ${formatClubDate(result.effectiveAt)}.`,
      });
    } catch (error) {
      toast.error("Richiesta non registrata", {
        description: convexMessage(error, "Riprova fra poco."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="delete-account-title"
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p id="delete-account-title" className="text-sm font-medium">
          Elimina il tuo account
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Hai 30 giorni per ripensarci.
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="pill"
        className="text-destructive hover:text-destructive hover:bg-destructive/5 w-full sm:w-auto"
        onClick={() => setOpen(true)}
      >
        Elimina account
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-normal tracking-[-0.02em]">
              Vuoi eliminare il tuo account?
            </DialogTitle>
            <DialogDescription>
              Leggi cosa succede prima di confermare.
            </DialogDescription>
          </DialogHeader>

          <ul className="bg-muted rounded-card text-muted-foreground list-disc space-y-2 py-5 pr-5 pl-9 text-sm leading-relaxed">
            <li>
              Il tuo account verrà eliminato il{" "}
              <strong className="text-foreground font-medium">
                {deadline}
              </strong>
              . Fino ad allora funziona come sempre, e puoi annullare da qui.
            </li>
            <li>
              Dopo non potrai più accedere al sito né all'app, e i punti che non
              hai usato andranno persi.
            </li>
            <li>Le prenotazioni già fissate restano in agenda a tuo nome.</li>
            <li>
              Una copia dei tuoi dati resta conservata per un anno, poi viene
              cancellata del tutto.
            </li>
          </ul>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" size="pill" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              size="pill"
              className="active:scale-[0.98]"
              disabled={loading}
              onClick={() => void confirm()}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Elimina tra 30 giorni
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
