"use client";

import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId, useRef } from "react";

import { EASE_OUT, UI_DURATION } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Una riga di un elenco raggruppato (list.tsx) che si apre sul posto: il
 * dettaglio compare subito sotto, dove si è guardato, invece che in fondo
 * alla scheda. È la forma da desktop dei dettagli che da telefono stanno in
 * un drawer annidato; chi la usa tiene aperta una riga alla volta.
 *
 * La freccia gira verso il basso quando è aperta, come le liste a scomparsa
 * di macOS; il pannello entra dalla riga, incassato in un grigio appena più
 * scuro, così si legge di chi è. Se apre oltre il bordo, si scorre fin lì.
 */
export function DisclosureRow({
  title,
  subtitle,
  trailing,
  label,
  open,
  onToggle,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  /** Il nome del pannello, per i lettori di schermo. */
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const panelId = useId();
  const panel = useRef<HTMLDivElement>(null);

  // Chi riduce le animazioni vede comparire il pannello, senza che si apra.
  const collapsed = reduce ? { opacity: 0 } : { height: 0, opacity: 0 };
  const expanded = reduce ? { opacity: 1 } : { height: "auto", opacity: 1 };

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors outline-none",
          "active:bg-muted/80 md:hover:bg-muted/50 focus-visible:bg-muted/60",
          open && "bg-muted/70",
        )}
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-[15px] leading-snug",
              open && "font-medium",
            )}
          >
            {title}
          </span>
          {subtitle && (
            <span className="text-muted-foreground mt-0.5 block truncate text-[13px] leading-snug">
              {subtitle}
            </span>
          )}
        </span>
        {trailing && <span className="shrink-0">{trailing}</span>}
        <ChevronRight
          aria-hidden
          className={cn(
            "text-muted-foreground/70 size-4 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none",
            open && "rotate-90",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.section
            id={panelId}
            aria-label={label}
            className="overflow-hidden"
            initial={collapsed}
            animate={expanded}
            exit={{
              ...collapsed,
              transition: { duration: UI_DURATION.exit, ease: EASE_OUT },
            }}
            transition={{ duration: UI_DURATION.enter, ease: EASE_OUT }}
            onAnimationComplete={(target) => {
              // Solo all'apertura: anche la chiusura finisce qui.
              if ((target as { opacity?: number }).opacity !== 1) return;
              panel.current?.scrollIntoView({
                block: "nearest",
                behavior: reduce ? "auto" : "smooth",
              });
            }}
          >
            <div ref={panel} className="bg-muted/70 border-t px-3 pt-3 pb-4">
              {children}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
