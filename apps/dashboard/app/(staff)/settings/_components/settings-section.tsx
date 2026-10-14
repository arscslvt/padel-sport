import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Una sezione di Configurazione, in due forme.
 *
 * Da telefono è un gruppo delle Impostazioni di iOS: il titolo piccolo sopra
 * l'elenco, la spiegazione sotto come nota a piè. Da desktop lo spazio in
 * larghezza c'è, e la sezione diventa una riga: titolo e spiegazione in una
 * colonna stretta a sinistra, i controlli a destra. Chi scorre legge i titoli
 * di fila, e i controlli restano in colonna, alla stessa altezza.
 *
 * I figli sono gli elenchi veri e propri (`ListGroup` senza titolo), più gli
 * eventuali avvisi.
 */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-12 lg:border-t lg:pt-8 lg:first:border-t-0 lg:first:pt-0">
      <header className="px-1 lg:px-0">
        <h2 className="text-muted-foreground text-[13px] font-medium lg:text-foreground lg:text-[15px] lg:font-semibold">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground mt-1 hidden text-sm leading-relaxed lg:block">
            {description}
          </p>
        )}
      </header>
      <div className="min-w-0 space-y-2 lg:max-w-xl">
        {children}
        {description && (
          <p className="text-muted-foreground px-1 text-xs leading-relaxed lg:hidden">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}

/** Le sezioni di una linguetta, con il ritmo verticale di Configurazione. */
export function SettingsStack({ children }: { children: ReactNode }) {
  return <div className="space-y-6 lg:space-y-8">{children}</div>;
}

/**
 * Un avviso sotto l'elenco: qualcosa da sapere prima che diventi un problema
 * (tessere da rinnovare, chiavi che mancano sul server). Compare con la
 * stessa dissolvenza del cambio di linguetta: è uno stato che cambia.
 */
export function SettingsNotice({ children }: { children: ReactNode }) {
  return (
    <p className="settings-enter border-warning-border bg-warning-subtle text-warning-foreground flex gap-2.5 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** La forma di un elenco che sta arrivando: righe con titolo, sottotitolo e levetta. */
export function SettingsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="bg-card overflow-hidden rounded-2xl border [&>*+*]:border-t">
      {Array.from({ length: rows }, (_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: righe segnaposto, sempre le stesse.
          key={index}
          aria-hidden
          className="flex min-h-14 items-center gap-3 px-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
          <Skeleton className="h-[1.15rem] w-8 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Caricamento…</span>
    </div>
  );
}
