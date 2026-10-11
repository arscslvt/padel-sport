import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * L'intestazione di ogni pagina della dashboard.
 *
 * Da telefono il titolo è grande e da solo, come nelle app iOS: dice dove si
 * è, e il contenuto parte subito sotto. La descrizione serve a chi apre la
 * pagina la prima volta da un computer; da telefono, dove la si rileggerebbe
 * a ogni apertura, resta fuori. Le azioni stanno a destra del titolo, dove il
 * pollice destro arriva senza cercarle.
 *
 * Lo spazio in alto tiene conto dell'incavo dell'iPhone: la dashboard si
 * disegna fin sotto la barra di stato (`viewportFit: cover`).
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <header
      className={cn(
        "px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 md:px-6 md:pt-6",
        className,
      )}
    >
      {back && (
        <Link
          href={back.href}
          className="text-muted-foreground hover:text-foreground -ml-1 mb-1 inline-flex min-h-9 items-center gap-0.5 text-[15px] transition-colors"
        >
          <ChevronLeft className="size-5" />
          {back.label}
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] md:text-2xl">
          {title}
        </h1>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {description && (
        <p className="text-muted-foreground mt-1.5 hidden max-w-2xl text-sm md:block">
          {description}
        </p>
      )}
    </header>
  );
}

/** Il corpo della pagina sotto l'intestazione, con i margini della dashboard. */
export function PageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6 px-4 pb-6 md:px-6", className)}>
      {children}
    </div>
  );
}
