"use client";

import { formatClubDate } from "@/lib/points";
import { cn } from "@/lib/utils";

import { SectionTitle } from "./section-title";
import type { Wallet, WalletRedemption } from "./types";

/**
 * I premi già riscattati: quelli da ritirare in evidenza con il codice da
 * mostrare allo sportello, gli altri spenti come storico.
 */

const STATE_LABELS: Record<WalletRedemption["state"], string> = {
  active: "Da ritirare",
  used: "Ritirato",
  cancelled: "Annullato",
  expired: "Scaduto",
};

export function RedeemedRewards({ wallet }: { wallet: Wallet }) {
  if (wallet.redemptions.length === 0) return null;

  return (
    <section aria-labelledby="redemptions-title" className="space-y-5">
      <SectionTitle
        id="redemptions-title"
        title="Riscattati"
        description="Mostra il codice allo sportello per ritirare il premio."
      />

      <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {wallet.redemptions.map((redemption) => {
          const usable = redemption.state === "active";

          return (
            <li
              key={redemption.id}
              className={cn(
                "rounded-card p-5",
                usable ? "bg-muted" : "border-border/70 border",
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
  );
}
