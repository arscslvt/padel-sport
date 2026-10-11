"use client";

import { useWallet } from "./area-context";
import { RedeemedRewards } from "./redeemed-rewards";
import { RewardsGrid } from "./rewards-grid";

/** La vetrina dei premi e, sotto, quelli già presi. */
export function RewardsSection() {
  const wallet = useWallet();

  if (wallet.rewards.length === 0 && wallet.redemptions.length === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-card border border-dashed px-6 py-8 text-sm leading-relaxed">
        I premi arrivano presto. Intanto i punti che guadagni in campo restano
        tutti sul tuo saldo.
      </p>
    );
  }

  return (
    <div className="space-y-14">
      <RewardsGrid
        rewards={wallet.rewards}
        balance={wallet.balance}
        canRedeem={wallet.program.state === "joined"}
      />
      <RedeemedRewards wallet={wallet} />
    </div>
  );
}
