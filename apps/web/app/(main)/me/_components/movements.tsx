"use client";

import { formatClubDate, signedPoints } from "@/lib/points";
import { cn } from "@/lib/utils";

import { ReportPoints } from "./report-points";
import { SectionTitle } from "./section-title";
import type { Wallet } from "./types";

/**
 * Gli ultimi movimenti di punti, da dove viene il saldo.
 *
 * «Segnala» sta qui accanto perché è guardando questo elenco che ci si
 * accorge che qualcosa non torna.
 */
export function Movements({ wallet }: { wallet: Wallet }) {
  const { transactions } = wallet;

  return (
    <section aria-labelledby="activity-title" className="space-y-5">
      <SectionTitle
        id="activity-title"
        title="Movimenti"
        description={
          transactions.length > 0
            ? "Gli ultimi punti caricati, tolti o spesi."
            : undefined
        }
        action={
          transactions.length > 0 ? (
            <ReportPoints transactions={transactions} />
          ) : undefined
        }
      />

      {transactions.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-card border border-dashed px-6 py-8 text-sm leading-relaxed">
          Ancora nessun movimento. I punti arrivano quando lo staff li carica
          dopo una partita, e li trovi qui.
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-baseline justify-between gap-4 py-3.5 first:pt-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{transaction.label}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {formatClubDate(transaction.createdAt)}
                  {transaction.pending && " · in attesa della tua adesione"}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 font-mono text-sm tabular-nums",
                  transaction.delta > 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {signedPoints(transaction.delta)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
