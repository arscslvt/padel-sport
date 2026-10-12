"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import {
  formatEuro,
  type ServicePrice,
} from "@padel-sport/backend/convex/modules/pricing/lib";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ListGroup, ListRow } from "@/app/_components/list";
import { SheetHeader } from "@/app/_components/sheet-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
} from "@/components/ui/responsive-drawer";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Il listino dei servizi prenotabili.
 *
 * È l'unica fonte del prezzo: lo leggono la prenotazione dal sito e
 * dall'app, quella dello sportello e, quando arriverà, il pagamento online.
 * La cassa SumUp invece non si aggiorna da qui — le sue API non espongono il
 * catalogo — e va allineata a mano.
 */

/** "7,50" o "7.50": da telefono la tastiera italiana mette la virgola. */
function parseEuro(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (!trimmed) return null;

  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
}

/** Il prezzo nel campo: con la virgola, come lo si scriverebbe. */
function euroInput(value: number | undefined): string {
  if (value === undefined) return "";
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(".", ",");
}

export function PriceList() {
  const services = useQuery(api.modules.pricing.services.list, {});
  // Il servizio resta in memoria anche a pannello chiuso: l'animazione di
  // chiusura non deve vedere sparire titolo e prezzi.
  const [editing, setEditing] = useState<ServicePrice | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-2xl">
      <ListGroup
        title="Servizi prenotabili"
        footer="Un prezzo nuovo vale per le prenotazioni da qui in avanti: quelle già prese restano al prezzo con cui sono nate. La cassa SumUp non si aggiorna da sola, quindi un prezzo cambiato qui va cambiato anche lì."
      >
        {services === undefined ? (
          <div className="p-4">
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          services.map((service) => (
            <ListRow
              key={service.kind}
              title={service.name}
              subtitle={service.description}
              trailing={
                <span className="flex flex-col items-end">
                  <span className="text-[15px] font-medium tabular-nums">
                    {formatEuro(service.price)}
                  </span>
                  {service.memberPrice !== undefined && (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      Tesserati {formatEuro(service.memberPrice)}
                    </span>
                  )}
                </span>
              }
              chevron
              onClick={() => {
                setEditing(service);
                setOpen(true);
              }}
            />
          ))
        )}
      </ListGroup>

      <PriceDialog service={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function PriceDialog({
  service,
  open,
  onOpenChange,
}: {
  service: ServicePrice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [price, setPrice] = useState("");
  const [memberPrice, setMemberPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !service) return;
    setPrice(euroInput(service.price));
    setMemberPrice(euroInput(service.memberPrice));
  }, [open, service]);

  const save = async () => {
    if (!service) return;

    const priceValue = parseEuro(price);
    const memberValue = parseEuro(memberPrice);

    if (priceValue === null || Number.isNaN(priceValue) || priceValue <= 0) {
      toast.error("Scrivi il prezzo a giocatore, in euro.");
      return;
    }
    if (
      memberValue !== null &&
      (Number.isNaN(memberValue) || memberValue <= 0)
    ) {
      toast.error("Il prezzo tesserati è un importo in euro, o resta vuoto.");
      return;
    }
    if (memberValue !== null && memberValue > priceValue) {
      toast.error("Il prezzo tesserati non può superare il prezzo pieno.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/dashboard/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: service.kind,
          price: priceValue,
          memberPrice: memberValue,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Prezzo non salvato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Listino aggiornato", {
        description: "Vale già per le nuove prenotazioni da sito e app.",
      });
      onOpenChange(false);
    } catch {
      toast.error("Prezzo non salvato", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDrawer open={open} setOpen={onOpenChange}>
      <ResponsiveDrawerContent className="sm:max-w-md">
        <SheetHeader
          title={service?.name ?? "Prezzo"}
          description={service?.description}
        />

        <div className="space-y-4 px-4 pt-1 md:-mx-1 md:px-1">
          <div className="space-y-1.5">
            <Label htmlFor="price-full">Prezzo a giocatore (€)</Label>
            <Input
              id="price-full"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Es. 7"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price-member">Prezzo tesserati (€)</Label>
            <Input
              id="price-member"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Facoltativo"
              value={memberPrice}
              onChange={(event) => setMemberPrice(event.target.value)}
            />
            <p className="text-muted-foreground text-xs leading-relaxed">
              Vale per chi prenota con la tessera in corso e pagata. Gli altri
              giocatori della squadra pagano il prezzo pieno: a un compagno
              tesserato lo sconto si applica in cassa. Vuoto: pagano tutti il
              prezzo pieno.
            </p>
          </div>
        </div>

        {/* Da telefono il bottone principale sta sopra, a portata di pollice. */}
        <ResponsiveDrawerFooter className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salva
          </Button>
        </ResponsiveDrawerFooter>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}
