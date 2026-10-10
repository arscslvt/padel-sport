import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Elenchi raggruppati, come le Impostazioni di iOS.
 *
 * È la forma di quasi tutto quello che lo staff tocca da telefono: una
 * superficie bianca arrotondata, righe alte quanto un pollice, separatori
 * sottili che non arrivano al bordo sinistro. Il gruppo dà il contesto (il
 * titolo sopra, la nota sotto), la riga dice una cosa sola.
 */

export function ListGroup({
  title,
  action,
  footer,
  children,
  className,
}: {
  title?: ReactNode;
  /** A destra del titolo: «Vedi tutte», un contatore. */
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {(title || action) && (
        <div className="flex items-baseline justify-between gap-3 px-1">
          {title && (
            <h2 className="text-muted-foreground text-[13px] font-medium">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      <div className="bg-card overflow-hidden rounded-2xl border [&>*+*]:border-t">
        {children}
      </div>
      {footer && (
        <p className="text-muted-foreground px-1 text-xs leading-relaxed">
          {footer}
        </p>
      )}
    </section>
  );
}

type Tone = "default" | "danger";

interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** A destra: un valore, un badge, un'azione. */
  trailing?: ReactNode;
  /** La freccia di chi apre un'altra pagina o un pannello. */
  chevron?: boolean;
  selected?: boolean;
  tone?: Tone;
  href?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Una riga. Diventa un link con `href`, un pulsante con `onClick`, e resta
 * una riga ferma senza nessuno dei due. Alta almeno 56px: il bersaglio di un
 * pollice, non di un cursore.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  chevron,
  selected,
  tone = "default",
  href,
  onClick,
  className,
}: ListRowProps) {
  const interactive = Boolean(href || onClick);

  const body = (
    <>
      {leading && (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center",
            tone === "danger" ? "text-danger" : "text-muted-foreground",
          )}
        >
          {leading}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px] leading-snug",
            tone === "danger" && "text-danger",
            selected && "font-medium",
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="text-muted-foreground mt-0.5 block truncate text-[13px] leading-snug">
            {subtitle}
          </span>
        )}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
      {chevron && (
        <ChevronRight className="text-muted-foreground/70 size-4 shrink-0" />
      )}
    </>
  );

  const classes = cn(
    "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left",
    interactive &&
      "transition-colors active:bg-muted/80 md:hover:bg-muted/50 focus-visible:bg-muted/60 outline-none",
    selected && "bg-muted/50",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-current={selected ? "page" : undefined}
      >
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
}
