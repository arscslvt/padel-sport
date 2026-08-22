import { CalendarCheck } from "lucide-react";

import { cn } from "@/lib/utils";

const LABEL = "Evento concluso";

/**
 * Pastiglia da sovrapporre alla copertina nella lista: chi scorre /events vede
 * prima l'immagine del titolo, e senza un segno lì sopra un torneo del mese
 * scorso sembra ancora aperto. `bg-background/85` e non un grigio fisso perché
 * la card rende anche dentro `tone-ink`, dove i token si invertono.
 */
export function EventConcludedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "border-border/60 bg-background/85 text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase backdrop-blur-sm",
        className,
      )}
    >
      <CalendarCheck className="size-3" />
      {LABEL}
    </span>
  );
}

/** Lo stesso avviso in cima all'articolo, dove c'è spazio per una frase intera. */
export function EventConcludedAlert({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-border bg-muted text-muted-foreground flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        className,
      )}
    >
      <CalendarCheck className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="text-foreground font-medium">{LABEL}.</span> Questa
        pagina resta online come archivio: le informazioni qui sotto si
        riferiscono a una data già passata.
      </p>
    </div>
  );
}
