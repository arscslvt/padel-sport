"use client";

import { Loader2, Merge, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type ClientOption,
  ClientSuggestions,
  LinkedClient,
  useClientMatches,
  useClients,
} from "@/app/_components/agenda/client-search";
import { SheetHeader } from "@/app/_components/sheet-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
} from "@/components/ui/responsive-drawer";

import type { ClientDetail } from "./types";

/**
 * Unire un doppione alla scheda giusta, accanto a «Elimina questa scheda».
 *
 * Serve quando la stessa persona ha due schede, di solito una aperta allo
 * sportello e una nata dall'account: eliminare il doppione perderebbe le sue
 * prenotazioni e i suoi punti, unirlo li porta sull'altra
 * (packages/backend/convex/modules/clients/merge.ts).
 */
export function MergeClient({
  client,
  disabled,
  onMerged,
}: {
  client: ClientDetail;
  disabled: boolean;
  onMerged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<ClientOption | null>(null);
  const [movePoints, setMovePoints] = useState(true);
  const [working, setWorking] = useState(false);

  const clients = useClients();
  const matches = useClientMatches(clients, query, [client.id]);

  const reset = () => {
    setQuery("");
    setTarget(null);
    setMovePoints(true);
  };

  const merge = async () => {
    if (!target) return;

    setWorking(true);
    try {
      const response = await fetch(
        `/api/dashboard/clients/${client.id}/merge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intoId: target.id,
            points: movePoints ? "move" : "drop",
          }),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Schede non unite", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Schede unite", {
        description: `Resta solo la scheda di ${target.name}.`,
      });
      setOpen(false);
      reset();
      onMerged();
    } catch {
      toast.error("Schede non unite", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Merge className="size-4" />
        Unisci a un'altra scheda
      </Button>

      <ResponsiveDrawer
        open={open}
        setOpen={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <ResponsiveDrawerContent className="sm:max-w-lg">
          <SheetHeader
            title="Unisci a un'altra scheda"
            description={`Per quando ${client.name} ha due schede. Questa sparisce e tutto passa a quella che scegli.`}
          />

          <div className="space-y-4 px-4 md:px-0">
            <div className="space-y-1.5">
              <Label htmlFor="merge-target">La scheda da tenere</Label>
              {target ? (
                <LinkedClient
                  name={target.name}
                  level={target.level}
                  onUnlink={() => setTarget(null)}
                />
              ) : (
                <>
                  <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="merge-target"
                      value={query}
                      autoComplete="off"
                      placeholder="Cerca per nome o telefono"
                      className="pl-9"
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </div>
                  <ClientSuggestions
                    options={matches}
                    onPick={(option) => {
                      setTarget(option);
                      setQuery("");
                    }}
                  />
                </>
              )}
            </div>

            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              <li>
                Le prenotazioni in cui prenota o gioca passano all'altra scheda.
              </li>
              <li>Anche le tessere.</li>
              <li>
                Dell'anagrafica si prende ciò che manca sull'altra scheda:
                telefono, nascita, residenza, codice fiscale.
              </li>
            </ul>

            {client.points > 0 && (
              <div className="flex items-start gap-3 rounded-xl border p-3">
                <Checkbox
                  id="merge-points"
                  checked={movePoints}
                  onCheckedChange={(checked) => setMovePoints(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="merge-points">
                    Porta anche i suoi {client.points} punti
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Togli la spunta se li hai già caricati a mano sull'altra
                    scheda: verrebbero contati due volte.
                  </p>
                </div>
              </div>
            )}
          </div>

          <ResponsiveDrawerFooter className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button onClick={() => void merge()} disabled={!target || working}>
              {working ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Merge className="size-4" />
              )}
              Unisci le schede
            </Button>
          </ResponsiveDrawerFooter>
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>
    </>
  );
}
