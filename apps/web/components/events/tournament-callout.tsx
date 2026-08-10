import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { SHOW_TOURNAMENT_BANNER, TROFEO_LINK } from "@/lib/links";

/**
 * Rimando temporaneo al Trofeo San Sebastiano.
 *
 * Il torneo non è un contenuto Sanity, quindi non comparirebbe fra gli eventi:
 * questo blocco è l'unico modo per raggiungerlo da /events. È provvisorio — a
 * torneo finito basta mettere `SHOW_TOURNAMENT_BANNER` a `false` in
 * `lib/links.ts` per farlo sparire da qui e dal menu, e poi cancellare questo
 * file insieme alla sua chiamata in `app/(main)/events/page.tsx`.
 */
export function TournamentCallout() {
  if (!SHOW_TOURNAMENT_BANNER) return null;

  return (
    <Link
      href={TROFEO_LINK}
      className="border-border bg-muted rounded-card hover:border-foreground/25 group flex flex-col gap-5 border p-6 transition-[border-color,box-shadow] hover:shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-8 lg:p-8"
    >
      <div>
        <span className="text-muted-foreground flex items-center gap-2 text-xs tracking-[0.18em] uppercase">
          <span className="bg-foreground size-1.5 animate-pulse rounded-full" />
          In corso
        </span>
        <Heading size="sub" className="mt-2.5">
          1° Torneo di Padel <em className="italic">Trofeo San Sebastiano</em>
        </Heading>
        <p className="text-muted-foreground mt-1.5 max-w-[52ch] text-sm">
          Regolamento, formula e calendario del torneo che chiude la stagione.
        </p>
      </div>

      {/* Il blocco intero è già un link: questo è solo l'affordance visiva,
          quindi uno `span` e non un bottone annidato in un'ancora. */}
      <span
        aria-hidden
        className={buttonVariants({
          size: "pill",
          variant: "inverse",
          className: "w-fit shrink-0",
        })}
      >
        Vai al torneo
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
