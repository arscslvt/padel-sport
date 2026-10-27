import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * I pezzi del gestionale vero, ridisegnati in piccolo per la pagina.
 *
 * Non sono schermate finte: sono gli stessi componenti della dashboard di
 * Vetro (badge di stato, righe dell'agenda, tasca degli avvisi), con le
 * stesse misure e gli stessi colori del suo tema chiaro, riempiti con dati
 * d'esempio. Così quello che si vede qui è quello che lo staff trova
 * aprendo il gestionale.
 */

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-success-border bg-success-subtle text-success-foreground",
  warning: "border-warning-border bg-warning-subtle text-warning-foreground",
  danger: "border-danger-border bg-danger-subtle text-danger-foreground",
  info: "border-info-border bg-info-subtle text-info-foreground",
};

export function StatusBadge({
  tone,
  icon: IconComponent,
  children,
  className,
}: {
  tone: Tone;
  icon?: Icon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {IconComponent && <IconComponent className="size-3.5" weight="bold" />}
      {children}
    </span>
  );
}

/**
 * Una superficie del gestionale: la scheda piena su cui poggiano i dati.
 * Raggio 20: la tasca degli avvisi sotto una riga tiene i badge (raggio 12)
 * a 8px dal bordo, e 12 + 8 fa 20. Chi ha figli diversi negli angoli lo
 * sovrascrive con il proprio conto.
 */
export function Surface({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "border border-border bg-card shadow-[0_1px_2px_oklch(0_0_0/4%)]",
        // Con `concentric` il raggio lo calcola la superficie stessa.
        !className?.includes("concentric") && "rounded-[20px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * La cornice dei componenti di prodotto: il grigio del gestionale dentro un
 * bordo sottile, con un'ombra lunga tinta di verde che la stacca dal fondo.
 *
 * Il margine interno è `--pad` (12px da telefono, 24px da sm) e il raggio è
 * 16 + margine: negli angoli stanno il tasto tondo di ricerca, la pillola
 * «Nuova prenotazione», la notifica e il logo del club, tutti di raggio 16.
 * Chi sta dentro usa `--pad` per i propri margini e resta concentrico.
 */
export function ProductFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[calc(1rem+var(--pad))] bg-background shadow-frame [--pad:0.75rem] sm:[--pad:1.5rem]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Le iniziali di una persona, come nella lista clienti. */
export function Initials({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const letters = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-content-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand",
        className,
      )}
    >
      {letters}
    </span>
  );
}

/** Un'etichetta di sezione dentro il prodotto, come nell'agenda. */
export function PaneLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}
