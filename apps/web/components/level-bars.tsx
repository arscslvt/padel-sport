import { cn } from "@/lib/utils";

/** Verde, giallo, rosso: dalla fascia più facile alla più impegnativa. */
const LEVEL_COLORS = ["text-emerald-500", "text-amber-500", "text-red-500"];

/**
 * Il livello in tre stanghette, come la tacca del segnale: piene fino alla
 * fascia, spente le altre. Si legge al volo anche senza l'etichetta accanto.
 *
 * `filled` è il numero di stanghette accese, da 1 a 3: la posizione della
 * fascia in `LEVEL_RANGES` più uno. Il colore segue la fascia — verde, giallo,
 * rosso — così le tre si distinguono anche senza contare le tacche.
 */
export function LevelBars({
  filled,
  className,
}: {
  filled: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0",
        LEVEL_COLORS[Math.min(Math.max(filled, 1), 3) - 1],
        className,
      )}
    >
      {[0, 1, 2].map((index) => {
        const height = 6 + index * 4;
        return (
          <rect
            key={index}
            x={1.5 + index * 5}
            y={14 - height}
            width={3}
            height={height}
            rx={1}
            fill="currentColor"
            opacity={index < filled ? 1 : 0.25}
          />
        );
      })}
    </svg>
  );
}
