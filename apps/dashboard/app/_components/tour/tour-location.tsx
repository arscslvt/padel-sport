"use client";

import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

import { PRIMARY_NAV, SECONDARY_NAV } from "../nav";

const ITEMS = [
  ...PRIMARY_NAV,
  ...SECONDARY_NAV.flatMap((group) => group.items),
];

/**
 * «Sei qui», sopra la cornice: la sezione che si sta guardando, con la sua
 * icona della barra.
 *
 * Quando uno step porta su un'altra pagina, la cornice cambia contenuto ma
 * chi guarda non ha toccato niente: senza avviso sembra che l'app abbia
 * fatto da sé. Per tutto lo step in cui la pagina è cambiata l'indicazione
 * diventa chiara e dice «Ora sei in …», e non sparisce a tempo: chi legge
 * piano la ritrova ancora lì. Un'onda parte una volta dal bordo, come sui
 * riquadri accesi.
 */
export function TourLocation({
  href,
  changed,
  reduce,
}: {
  href: string;
  changed: boolean;
  reduce: boolean;
}) {
  const item = ITEMS.find((entry) => entry.href === href) ?? PRIMARY_NAV[0];

  return (
    <div className="relative flex justify-center" aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`${item.href}:${changed}`}
          initial={
            reduce
              ? { opacity: 0 }
              : { opacity: 0, transform: "scale(0.94)", filter: "blur(4px)" }
          }
          animate={{ opacity: 1, transform: "scale(1)", filter: "blur(0px)" }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.12 } }
              : {
                  opacity: 0,
                  transform: "scale(0.97)",
                  filter: "blur(4px)",
                  transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] },
                }
          }
          transition={
            reduce
              ? { duration: 0.2 }
              : { type: "spring", visualDuration: 0.4, bounce: 0.2 }
          }
          className={cn(
            "relative flex h-9 items-center gap-2 rounded-full px-3.5 text-[14px] whitespace-nowrap",
            changed ? "bg-white text-neutral-950" : "bg-white/10 text-white/75",
          )}
        >
          {changed && !reduce && (
            <span className="tour-ping absolute inset-0 rounded-full" />
          )}
          {changed && <span className="text-neutral-500">Ora sei in</span>}
          <item.icon className="size-4" aria-hidden />
          <span className="font-semibold">{item.name}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
