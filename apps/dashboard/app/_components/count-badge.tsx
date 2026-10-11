import { cn } from "@/lib/utils";

/**
 * Il numero di cose da fare: sulla barra in basso, nella barra laterale, in
 * testa a una sezione. È l'unico posto che ne decide l'aspetto — chi lo usa
 * lo posiziona e basta, senza ridargli colori o forme.
 *
 * Rosso come i badge di iOS: è l'unico punto della dashboard dove il colore
 * da solo basta, perché il numero accanto dice già di cosa si tratta. Oltre
 * il 99 non serve precisione: «99+» si legge al volo, «137» no.
 *
 * `sm` sta sull'angolo di un'icona; `md` accanto a un'etichetta.
 */
export function CountBadge({
  count,
  size = "md",
  className,
}: {
  count: number;
  size?: "sm" | "md";
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      aria-hidden
      className={cn(
        // Il colore del testo è dichiarato qui e non ereditato: i contenitori
        // (la voce attiva della barra laterale, per esempio) ne impongono uno
        // loro, e il numero deve restare bianco ovunque.
        "bg-danger inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none text-white tabular-nums",
        size === "sm"
          ? "h-4.5 min-w-4.5 px-1 text-[10px]"
          : "h-5 min-w-5 px-1.5 text-xs",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
