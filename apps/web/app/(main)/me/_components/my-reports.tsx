"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { CATEGORY_LABELS } from "@padel-sport/backend/convex/modules/pointReports/lib";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";

import { Skeleton } from "@/components/ui/skeleton";
import { formatClubDate, signedPoints } from "@/lib/points";
import { cn } from "@/lib/utils";

import { useWallet } from "./area-context";
import { ReportPoints } from "./report-points";
import { SectionTitle } from "./section-title";

/**
 * Le segnalazioni sui punti inviate da «Segnala», con lo stato in cui sono.
 *
 * Una sezione a sé dell'area personale, con il bottone per aprirne una nuova.
 * La query è reattiva: quando lo staff le prende in carico o le chiude, il
 * cliente lo vede senza ricaricare, oltre che nella mail.
 */

type Report = FunctionReturnType<
  typeof api.modules.pointReports.mine.default
>[number];

/** Le parole del cliente, non quelle del gestionale: «da vedere» è affar nostro. */
const STATUS: Record<Report["status"], { label: string; dot: string }> = {
  new: { label: "Inviata", dot: "bg-amber-500" },
  in_progress: { label: "In lavorazione", dot: "bg-sky-500" },
  resolved: { label: "Risolta", dot: "bg-emerald-500" },
  archived: { label: "Chiusa", dot: "bg-muted-foreground/50" },
};

export function MyReports() {
  const wallet = useWallet();
  const reports = useQuery(api.modules.pointReports.mine.default, {});

  return (
    <section aria-labelledby="reports-title" className="space-y-5">
      <SectionTitle
        id="reports-title"
        title="Segnalazioni"
        description="Punti che non tornano o un dubbio su un movimento: lo staff ti risponde qui e via mail."
        action={<ReportPoints transactions={wallet.transactions} prominent />}
      />

      {reports === undefined ? (
        <div className="space-y-2.5" aria-busy="true">
          <Skeleton className="rounded-card h-28 w-full" />
          <Skeleton className="rounded-card h-28 w-full" />
        </div>
      ) : reports.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-card border border-dashed px-6 py-8 text-sm leading-relaxed">
          Nessuna segnalazione inviata. Se un movimento non ti torna, apri una
          segnalazione: la trovi qui con la risposta del club.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {reports.map((report) => {
            const status = STATUS[report.status];
            const closed =
              report.status === "resolved" || report.status === "archived";

            return (
              <li
                key={report.id}
                className={cn(
                  "rounded-card p-5",
                  closed ? "border-border/70 border" : "bg-muted",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {CATEGORY_LABELS[report.category]}
                    </p>
                    <p className="text-muted-foreground mt-1 truncate text-xs">
                      {report.transaction
                        ? `${report.transaction.label} · ${signedPoints(report.transaction.delta)} · `
                        : ""}
                      Inviata il {formatClubDate(report.createdAt)}
                    </p>
                  </div>
                  <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
                    <span
                      aria-hidden
                      className={cn("size-1.5 rounded-full", status.dot)}
                    />
                    {status.label}
                  </span>
                </div>

                <p className="text-muted-foreground mt-3 line-clamp-2 text-sm leading-relaxed">
                  {report.message}
                </p>

                {report.reply && (
                  <div className="bg-background mt-4 rounded-xl px-4 py-3">
                    <p className="text-muted-foreground text-xs">
                      Risposta del club
                    </p>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                      {report.reply}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
