"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarClock, Loader2, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SheetHeader } from "@/app/_components/sheet-header";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
} from "@/components/ui/responsive-drawer";
import { cn } from "@/lib/utils";

import type { ClientDetail } from "./types";

/**
 * L'eliminazione dell'account, dalla scheda cliente.
 *
 * Due strade (packages/backend/convex/modules/clients/deletion.ts):
 * **controllata**, trenta giorni in cui la persona può annullare dalla sua
 * area personale, ed è quella proposta; **subito**, per chi lo chiede allo
 * sportello o per un account da chiudere senza attese. Le schede senza
 * account hanno solo la seconda: non c'è nessuno che possa annullare.
 *
 * In entrambi i casi la scheda non sparisce: resta congelata come copia per
 * un anno, fuori dall'elenco e dalle ricerche.
 */

type Mode = "scheduled" | "now";

const day = (timestamp: number) =>
  format(timestamp, "d MMMM yyyy", { locale: it });

async function call(
  playerId: string,
  init: RequestInit,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(
      `/api/dashboard/clients/${playerId}/deletion`,
      init,
    );
    const payload = await response.json().catch(() => null);
    return response.ok
      ? { ok: true }
      : { ok: false, error: payload?.error ?? "Riprova fra poco." };
  } catch {
    return { ok: false, error: "Controlla la connessione e riprova." };
  }
}

function start(playerId: string, mode: Mode) {
  return call(playerId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}

export function DeleteClient({
  client,
  disabled,
  onScheduled,
  onDeleted,
}: {
  client: ClientDetail;
  disabled: boolean;
  /** Avviata la controllata: la scheda resta, con l'avviso. */
  onScheduled: () => void;
  /** Eliminata subito: la scheda esce dall'elenco. */
  onDeleted: () => void;
}) {
  const hasAccount = Boolean(client.clerkUserId);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(hasAccount ? "scheduled" : "now");
  const [working, setWorking] = useState(false);

  const confirm = async () => {
    setWorking(true);
    const result = await start(client.id, mode);
    setWorking(false);

    if (!result.ok) {
      toast.error("Account non eliminato", { description: result.error });
      return;
    }

    setOpen(false);
    if (mode === "now") {
      toast.success("Scheda eliminata", {
        description: hasAccount
          ? "L'accesso è chiuso e la persona riceve una mail."
          : "Resta come copia per un anno, fuori dall'elenco.",
      });
      onDeleted();
    } else {
      toast.success("Eliminazione avviata", {
        description: `Diventa effettiva il ${day(Date.now() + 30 * 86_400_000)}, salvo ripensamenti.`,
      });
      onScheduled();
    }
  };

  const options: { value: Mode; title: string; detail: string }[] = [
    {
      value: "scheduled",
      title: "Fra 30 giorni",
      detail:
        "La persona riceve una mail e può annullare dalla sua area personale. Fino ad allora l'account funziona come sempre.",
    },
    {
      value: "now",
      title: "Subito",
      detail:
        "L'accesso si chiude adesso e la persona riceve una mail. Non si torna indietro.",
    },
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Trash2 className="size-4" />
        {hasAccount ? "Elimina account" : "Elimina questa scheda"}
      </Button>

      <ResponsiveDrawer open={open} setOpen={setOpen}>
        <ResponsiveDrawerContent className="sm:max-w-lg">
          <SheetHeader
            title={hasAccount ? "Elimina account" : "Elimina questa scheda"}
            description={`${client.name} esce dall'anagrafica. La scheda resta come copia per un anno, poi se ne va del tutto.`}
          />

          <div className="space-y-4 px-4 md:px-0">
            {hasAccount && (
              <fieldset className="grid gap-2">
                <legend className="sr-only">Quando eliminarlo</legend>
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={mode === option.value}
                    onClick={() => setMode(option.value)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      mode === option.value
                        ? "border-foreground bg-muted/50"
                        : "md:hover:bg-muted/30",
                    )}
                  >
                    <span className="block text-sm font-medium">
                      {option.title}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                      {option.detail}
                    </span>
                  </button>
                ))}
              </fieldset>
            )}

            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              <li>
                Le prenotazioni da oggi in avanti restano in agenda col nome
                scritto, scollegate dalla scheda.
              </li>
              <li>
                Punti, tessere e storico restano nella copia, non si usano più.
              </li>
              {!hasAccount && (
                <li>Se è un doppione, meglio unirla all'altra scheda.</li>
              )}
            </ul>
          </div>

          <ResponsiveDrawerFooter className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirm()}
              disabled={working}
            >
              {working ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {mode === "now" ? "Elimina subito" : "Elimina fra 30 giorni"}
            </Button>
          </ResponsiveDrawerFooter>
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>
    </>
  );
}

/**
 * In cima all'anagrafica, quando l'eliminazione c'è: in corso, con le due
 * mosse che restano allo staff, o già fatta.
 */
export function DeletionStatus({
  client,
  disabled,
  onChanged,
  onDeleted,
}: {
  client: ClientDetail;
  disabled: boolean;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [working, setWorking] = useState<"cancel" | "now" | null>(null);
  const deletion = client.deletion;
  if (!deletion) return null;

  if (deletion.deletedAt) {
    return (
      <div className="border-danger-border bg-danger-subtle text-danger-foreground flex items-start gap-2.5 rounded-lg border p-3 text-sm">
        <Trash2 className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">
            Scheda eliminata il {day(deletion.deletedAt)}
          </p>
          <p className="text-xs leading-relaxed">
            È una copia congelata: fuori dall'elenco e dalle ricerche.
            {deletion.purgeAt &&
              ` Il ${day(deletion.purgeAt)} verrà rimossa del tutto.`}
          </p>
        </div>
      </div>
    );
  }

  const cancel = async () => {
    setWorking("cancel");
    const result = await call(client.id, { method: "DELETE" });
    setWorking(null);
    if (!result.ok) {
      toast.error("Eliminazione non annullata", { description: result.error });
      return;
    }
    toast.success("Eliminazione annullata", {
      description: "L'account resta com'è.",
    });
    onChanged();
  };

  const now = async () => {
    setWorking("now");
    const result = await start(client.id, "now");
    setWorking(null);
    if (!result.ok) {
      toast.error("Account non eliminato", { description: result.error });
      return;
    }
    toast.success("Account eliminato");
    onDeleted();
  };

  return (
    <div className="border-warning-border bg-warning-subtle text-warning-foreground space-y-3 rounded-lg border p-3 text-sm">
      <div className="flex items-start gap-2.5">
        <CalendarClock className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">
            Verrà eliminato il {day(deletion.effectiveAt)}
          </p>
          <p className="text-xs leading-relaxed">
            {deletion.requestedBy === "self"
              ? "L'ha chiesto la persona dalla sua area personale"
              : "L'ha chiesto il club"}{" "}
            il {day(deletion.requestedAt)}. Fino ad allora l'account funziona, e
            si può annullare.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-6.5">
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent"
          onClick={() => void cancel()}
          disabled={disabled || working !== null}
        >
          {working === "cancel" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Undo2 className="size-4" />
          )}
          Annulla eliminazione
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => void now()}
          disabled={disabled || working !== null}
        >
          {working === "now" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Elimina subito
        </Button>
      </div>
    </div>
  );
}
