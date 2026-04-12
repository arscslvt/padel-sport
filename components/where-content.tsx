"use client";

import Link from "next/link";
import { Copy, ExternalLink, MapPinned } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "./ui/badge";
import { getInfo } from "@/lib/info";
import { toast } from "sonner";

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
    <div className="flex flex-1 flex-col px-4 md:px-0">
      <div className="w-full overflow-hidden rounded-2xl border border-white/20 bg-emerald-950/25 shadow-2xl shadow-black/30">
        <iframe
          title="Mappa ASD PadelSport Melilli"
          src="https://www.google.com/maps?q=Via%20Pertini%2C%2096010%20Melilli%20SR&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-96 w-full md:h-96"
        />
      </div>

      <div className="flex flex-col md:flex-row items-center">
        <div className="mt-5 flex flex-1 flex-col items-center md:items-start gap-2 px-4">
          <p className="max-w-150 text-white/90">
            Ci trovi a Melilli, in provincia di Siracusa.
          </p>
          <div className="flex">
            <Badge className="rounded-full border-emerald-200/20 bg-emerald-100/10 font-medium text-emerald-50 px-3 py-1.5">
              <MapPinned className="size-4" />
              <span>Via Pertini, 96010 Melilli SR</span>
            </Badge>
            <Button
              variant={"outline"}
              className="rounded-full bg-emerald-100/10 text-emerald-50 border-emerald-200/20"
              onClick={copyAddressToClipboard}
            >
              <Copy />
            </Button>
          </div>
        </div>
        <div className="mt-8 flex">
          <Link
            href="https://maps.app.goo.gl/WWQoVqCrdZEY8Tj87"
            target="_blank"
            rel="noopener noreferrer"
            className="flex"
          >
            <Button
              size="lg"
              variant="default"
              className="h-12 rounded-full bg-emerald-400 px-7 font-heading text-emerald-950 hover:bg-emerald-300"
            >
              Apri navigazione in Google Maps
              <ExternalLink className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
