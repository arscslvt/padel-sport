import { cn } from "@/lib/utils";

/**
 * Il segnaposto di ciò che sta arrivando.
 *
 * Il colore è una velatura del colore del testo, non un grigio del tema: il
 * vecchio `bg-accent/30` era il grigio delle superfici al 30%, e sopra lo
 * sfondo quasi bianco della pagina spariva — lo scheletro c'era ma non si
 * vedeva. Partendo dal testo resta visibile su qualunque fondo, chiaro o
 * scuro (le bande `tone-ink` del sito ridichiarano `--foreground`).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-foreground/[0.07] animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
