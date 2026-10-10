import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Lo stato di qualcosa, in una pillola: prenotazione, richiesta, tessera.
 *
 * Quattro toni più il neutro, tutti dai token di globals.css: verde quando non
 * c'è niente da fare, ambra quando bisogna guardarci, rosso quando qualcosa è
 * scaduto o annullato, blu per l'informazione. L'etichetta c'è sempre: il
 * colore conferma, non spiega.
 */

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONES: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-success-border bg-success-subtle text-success-foreground",
  warning: "border-warning-border bg-warning-subtle text-warning-foreground",
  danger: "border-danger-border bg-danger-subtle text-danger-foreground",
  info: "border-info-border bg-info-subtle text-info-foreground",
};

export function StatusBadge({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: StatusTone;
  icon?: LucideIcon;
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
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}
