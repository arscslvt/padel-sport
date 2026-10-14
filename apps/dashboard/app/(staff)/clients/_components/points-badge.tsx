import { Coins, Snowflake } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Il saldo punti, accanto agli altri indicatori della riga.
 *
 * Un colore suo, fuori dalla scala rosso-ambra-verde delle tessere: i punti
 * non sono mai un problema da risolvere, e non devono sembrarlo. Con l'account
 * sospeso il saldo è congelato, e il badge lo dice con la stessa icona della
 * linguetta Punti.
 */
export function PointsBadge({
  points,
  frozen = false,
  className,
}: {
  points: number;
  frozen?: boolean;
  className?: string;
}) {
  const Icon = frozen ? Snowflake : Coins;

  return (
    <Badge
      variant="outline"
      title={frozen ? "Punti congelati: account sospeso" : undefined}
      className={cn(
        "font-normal tabular-nums",
        frozen
          ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200"
          : "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200",
        className,
      )}
    >
      <Icon className="size-3.5" />
      {points === 1 ? "1 punto" : `${points} punti`}
    </Badge>
  );
}
