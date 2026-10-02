"use client";

import { Heading } from "@/components/ui/heading";
import { formatClubDate, signedPoints } from "@/lib/points";
import { cn } from "@/lib/utils";

import type { Wallet, WalletRedemption } from "./types";

/**
 * I premi riscattati e gli ultimi movimenti.
 *
 * Stanno affiancati su schermo largo perché rispondono a due domande vicine
 * («cosa ho preso», «da dove vengono i punti») e nessuna delle due merita una
 * pagina a sé.
 */

const STATE_LABELS: Record<WalletRedemption["state"], string> = {
  active: "Da ritirare",
  used: "Ritirato",
  cancelled: "Annullato",
  expired: "Scaduto",
};

export function History({ wallet }: { wallet: Wallet }) {
  const hasRedemptions = wallet.redemptions.length > 0;
  const hasActivity = wallet.transactions.length > 0;

  if (!hasRedemptions && !hasActivity) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-12",
        hasRedemptions && hasActivity && "lg:grid-cols-2 lg:gap-16",
      )}
    >
      {hasRedemptions && (
        <section aria-labelledby="redemptions-title" className="space-y-5">
          <Heading as="h2" size="sub" id="redemptions-title">
            I tuoi premi
          </Heading>

          <ul className="space-y-2.5">
            {wallet.redemptions.map((redemption) => {
              const usable = redemption.state === "active";

              return (
                <li
                  key={redemption.id}
                  className={cn(
                    "rounded-card p-5",
                    usable ? "bg-muted" : "border border-border/70",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "font-medium",
                          !usable && "text-muted-foreground",
                        )}
                      >
                        {redemption.title}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {usable && redemption.expiresAt
                          ? `Da usare entro il ${formatClubDate(redemption.expiresAt)}`
                          : `Riscattato il ${formatClubDate(redemption.createdAt)}`}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {STATE_LABELS[redemption.state]}
                    </span>
                  </div>

                  {usable && (
                    <p className="bg-background mt-4 rounded-xl py-3 text-center font-mono text-2xl tracking-[0.3em]">
                      {redemption.code}
                    </p>
                  )}

                  {usable && redemption.terms && (
                    <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                      {redemption.terms}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {hasActivity && (
        <section aria-labelledby="activity-title" className="space-y-5">
          <Heading as="h2" size="sub" id="activity-title">
            Movimenti
          </Heading>

          <ul className="divide-border divide-y">
            {wallet.transactions.map((transaction) => (
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
        </section>
      )}
    </div>
  );
}
