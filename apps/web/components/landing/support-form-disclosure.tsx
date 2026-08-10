"use client";

import { ChevronDown, PenLine } from "lucide-react";
import React from "react";

import { SupportForm } from "@/components/landing/support-form";
import { Button } from "@/components/ui/button";
import { ANCHORS } from "@/lib/anchors";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Il modulo di supporto, a comparsa sotto `md`.
 *
 * Su schermo stretto cinque campi in fila sono un muro fra chi legge e i canali
 * diretti: qui restano dietro un pulsante, mentre da tablet in su il modulo è
 * sempre aperto.
 *
 * L'apertura è governata dal CSS (`grid-rows` 0fr → 1fr) e non dallo stato:
 * così non c'è nessun lampo alla prima pittura e da `md` in su il modulo è
 * visibile anche senza JavaScript. Lo stato serve solo al pulsante e a
 * disattivare i campi quando sono chiusi.
 */
export function SupportFormDisclosure() {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();
  // Chiuso davvero solo dove il pulsante esiste: da `md` in su il CSS lo apre
  // comunque, e i campi devono restare raggiungibili da tastiera.
  const collapsed = isMobile && !open;

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="pill"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={ANCHORS.supportForm}
        className="w-full justify-between md:hidden"
      >
        <span className="flex items-center gap-2">
          <PenLine className="size-4" strokeWidth={1.5} />
          {open ? "Chiudi il modulo" : "Scrivici un messaggio"}
        </span>
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-300",
            open && "rotate-180",
          )}
          strokeWidth={1.5}
        />
      </Button>

      <div
        id={ANCHORS.supportForm}
        inert={collapsed}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out md:grid-rows-[1fr]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        {/* `pt-6` dà anche l'aria che serve all'anello di focus per non
            essere tagliato dall'overflow. */}
        <div className="overflow-hidden">
          <div className="pt-6 md:pt-0">
            <SupportForm />
          </div>
        </div>
      </div>
    </div>
  );
}
