"use client";

import type { ComponentProps, ReactNode } from "react";

import { Heading } from "@/components/ui/heading";
import { cn } from "@/lib/utils";

/**
 * Pezzi ricorrenti del wizard di prenotazione.
 *
 * Sono qui e non in `components/ui` perché parlano solo questa lingua: chip
 * selezionabili, card di scelta e righe di riepilogo esistono in questa
 * pagina e basta. Se un giorno servissero altrove, è il momento di promuoverli.
 */

/** Su superficie grigia i campi hanno bisogno di fondo pieno per non sparirci dentro. */
export const FIELD_CLASS = "bg-background border-border h-11 rounded-xl";

export function StepHeader({
  step,
  total,
  title,
  subtitle,
}: {
  /** Assente sulla verifica dell'utente: è una soglia, non un passo. */
  step?: number;
  total?: number;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-8">
      {step !== undefined && total !== undefined && (
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          Passo {step} di {total}
        </p>
      )}
      <Heading as="h2" size="sub" className="mt-2">
        {title}
      </Heading>
      <p className="text-muted-foreground mt-1.5 max-w-[46ch] text-sm">
        {subtitle}
      </p>
    </header>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground mb-3 text-xs tracking-wide uppercase">
      {children}
    </p>
  );
}

interface ChipProps extends ComponentProps<"button"> {
  selected?: boolean;
}

/** Scelta singola in una fila: giorni e orari. */
export function Chip({ selected, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      data-selected={selected || undefined}
      className={cn(
        "border-border rounded-full border px-4 py-2 text-sm transition-colors",
        "hover:bg-foreground/5 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-35",
        "data-[selected]:bg-foreground data-[selected]:text-background data-[selected]:border-transparent",
        className,
      )}
      {...props}
    />
  );
}

/** Chip più alto, con etichetta e numero: la fila dei giorni. */
export function DayChip({
  label,
  dayNumber,
  selected,
  ...props
}: ChipProps & { label: string; dayNumber: string }) {
  return (
    <Chip
      selected={selected}
      className="flex min-w-16 flex-col items-center gap-0.5 rounded-2xl px-3 py-2.5"
      {...props}
    >
      <span className="text-xs opacity-70">{label}</span>
      <span className="text-base leading-none">{dayNumber}</span>
    </Chip>
  );
}

export function ChoiceCard({
  title,
  description,
  badge,
  selected,
  ...props
}: ComponentProps<"button"> & {
  title: string;
  description: string;
  badge?: string;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      data-selected={selected || undefined}
      className={cn(
        "border-border w-full rounded-2xl border p-4 text-left transition-colors",
        "hover:bg-foreground/[0.03] focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
        "data-[selected]:border-foreground data-[selected]:bg-foreground/[0.04]",
      )}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        {badge && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {badge}
          </span>
        )}
      </div>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </button>
  );
}

/** Nota di servizio: spiega una regola senza avere il peso di un alert. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground border-border mt-4 rounded-xl border border-dashed px-4 py-3 text-sm">
      {children}
    </p>
  );
}

export function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: ReactNode;
  onEdit?: () => void;
}) {
  return (
    <div className="border-border flex items-center justify-between gap-4 border-b py-3.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          {label}
        </p>
        <div className="mt-1 text-sm">{value}</div>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-muted-foreground hover:text-foreground shrink-0 text-sm underline underline-offset-4"
        >
          Modifica
        </button>
      )}
    </div>
  );
}
