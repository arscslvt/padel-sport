"use client";

import { Copy, ExternalLink, MapPinned } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInfo } from "@/lib/info";

export default function WhereContent() {
  const copyAddressToClipboard = () => {
    navigator.clipboard
      .writeText(getInfo("address") || "")
      .then(() => {
        toast.success("Indirizzo copiato negli appunti", {
          description: "Ora puoi incollarlo dove vuoi.",
        });
      })
      .catch((err) => {
        console.error("Errore durante la copia dell'indirizzo: ", err);
      });
  };

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="border-border bg-muted rounded-card w-full overflow-hidden border">
        <iframe
          title="Mappa ASD PadelSport Melilli"
          src="https://www.google.com/maps?q=Via%20Pertini%2C%2096010%20Melilli%20SR&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-96 w-full"
        />
      </div>

      <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground max-w-150 text-sm">
            Ci trovi a Melilli, in provincia di Siracusa.
          </p>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-border text-foreground rounded-full px-3 py-1.5 font-medium"
            >
              <MapPinned className="size-4" />
              <span>Via Pertini, 96010 Melilli SR</span>
            </Badge>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={copyAddressToClipboard}
              aria-label="Copia l'indirizzo"
            >
              <Copy />
            </Button>
          </div>
        </div>

        <Button asChild size="pill">
          <Link
            href="https://maps.app.goo.gl/WWQoVqCrdZEY8Tj87"
            target="_blank"
            rel="noopener noreferrer"
          >
            Apri navigazione in Google Maps
            <ExternalLink className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
