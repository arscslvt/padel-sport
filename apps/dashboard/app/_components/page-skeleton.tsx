import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { PageBody, PageHeader } from "./page-header";

/**
 * Una pagina della dashboard mentre arriva dal server (i `loading.tsx`).
 *
 * Le pagine sono dinamiche: ognuna controlla sul server che chi la apre sia
 * dello staff, e senza un `loading.tsx` Next aspettava quella risposta prima
 * di cambiare pagina. Il tocco sulla barra in basso restava senza effetto per
 * un attimo, come in un sito e non in un'app. Con questo scheletro Next lo
 * scarica insieme al link e cambia pagina subito: si vede già il titolo vero,
 * che dice dove si è, e il contenuto prende forma dove arriverà.
 *
 * Il contenuto compare un soffio dopo (`.page-skeleton`, globals.css): se la
 * pagina arriva in fretta lo scheletro non fa in tempo a lampeggiare.
 */
export function PageSkeleton({
  title,
  description,
  actions,
  mobileActions,
  variant = "list",
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Quanti pulsanti tondi ha la pagina in alto a destra. */
  actions?: number;
  /** Quanti ne ha solo da telefono (da desktop stanno altrove). */
  mobileActions?: number;
  /** La forma del contenuto: un elenco, preceduto da ricerca o linguette. */
  variant?: "list" | "search" | "tabs" | "detail";
  back?: { href: string; label: string };
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        back={back}
        actions={
          actions || mobileActions ? (
            <div className="flex items-center gap-2">
              {Array.from(
                { length: (actions ?? 0) + (mobileActions ?? 0) },
                (_, index) => (
                  <Skeleton
                    // biome-ignore lint/suspicious/noArrayIndexKey: segnaposto senza identità.
                    key={index}
                    className={cn(
                      "size-10 rounded-full",
                      index >= (actions ?? 0) && "md:hidden",
                    )}
                  />
                ),
              )}
            </div>
          ) : undefined
        }
      />
      <PageBody className="page-skeleton">
        {variant === "search" && (
          <Skeleton className="h-11 w-full rounded-xl" />
        )}
        {variant === "tabs" && (
          <div className="flex gap-2">
            {[20, 24, 16].map((width) => (
              <Skeleton
                key={width}
                className="h-9 rounded-full"
                style={{ width: `${width * 0.25}rem` }}
              />
            ))}
          </div>
        )}
        {variant === "detail" && (
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </div>
        )}
        <SkeletonRows />
      </PageBody>
    </>
  );
}

/** Schede come quelle vere: arrivati i dati, niente salta. */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }, (_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: segnaposto senza identità.
          key={index}
          className="bg-card flex items-center gap-4 rounded-2xl border px-4 py-3.5"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
