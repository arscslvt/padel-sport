import { cn } from "@/lib/utils";

/**
 * Il numero di cose da fare su una voce di navigazione o una sezione.
 *
 * Rosso come i badge di iOS: è l'unico punto della dashboard dove il colore
 * da solo basta, perché il numero accanto dice già di cosa si tratta. Oltre
 * il 99 non serve precisione: «99+» si legge al volo, «137» no.
 */
export function CountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "bg-danger flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
