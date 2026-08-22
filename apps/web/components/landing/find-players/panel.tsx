"use client";

import { UserRoundSearch } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { DURATION, EASE } from "@/lib/motion";
import { FindPlayersWizard } from "./wizard";

/**
 * Il modulo non c'è finché non lo si chiede.
 *
 * Prima la sezione arrivava con il riquadro grigio già aperto e otto campi
 * dentro: metà home occupata da un modulo che quasi nessuno stava compilando.
 * Ora resta il testo con un tasto sotto, e il modulo entra al clic.
 *
 * Lo stato vive qui e non nel wizard perché è il riquadro stesso a comparire,
 * e il riquadro lo disegna questo livello.
 */
export function FindPlayersPanel() {
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const transition = {
    duration: shouldReduceMotion ? 0.2 : DURATION.base,
    ease: EASE,
  };

  return (
    /* Stessa griglia a tre colonne delle feature card: il testo occupa la
       prima, il modulo le altre due. */
    <div className="grid gap-8 md:grid-cols-3 md:gap-2.5">
      <Reveal className="px-4 lg:px-5">
        <p className="text-muted-foreground max-w-[34ch] text-sm leading-relaxed">
          Inserisci la tua richiesta e lascia che sia la community a completare
          il match.
        </p>

        <AnimatePresence initial={false}>
          {!open && (
            /* Andandosene il tasto chiude anche lo spazio che occupa: da mobile
               il modulo gli sta sotto, e con la sola dissolvenza saltava su di
               scatto quando l'elemento veniva smontato, a animazione finita.
               `pb-1` è il respiro che serve all'anello di focus, che
               `overflow-hidden` taglierebbe. */
            <motion.div
              key="cta"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={transition}
              className="overflow-hidden"
            >
              <div className="pt-6 pb-1">
                <Button
                  type="button"
                  size="pill-lg"
                  /* Pieno finché la colonna è larga quanto lo schermo. */
                  className="w-full sm:w-fit"
                  onClick={() => setOpen(true)}
                >
                  <UserRoundSearch className="size-4" />
                  Cerca giocatori
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Reveal>

      {/* `min-w-0`: senza, la fila dei giorni — che scorre in orizzontale —
          allarga la colonna della griglia oltre lo schermo invece di scorrere
          al suo interno, e da mobile il riquadro esce dal viewport. */}
      <div className="min-w-0 md:col-span-2">
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="wizard"
              initial={
                shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={transition}
              className="rounded-card bg-muted p-6 sm:p-8 lg:p-10"
            >
              <FindPlayersWizard onClose={() => setOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
