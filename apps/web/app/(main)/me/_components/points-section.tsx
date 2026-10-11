"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useWallet } from "./area-context";
import { JoinProgram } from "./join-program";
import { Movements } from "./movements";
import { WalletCard } from "./wallet-card";

/**
 * La sezione d'apertura: il saldo e da dove viene.
 *
 * I vecchi link a `/me#bookings` — mail, il rimando dopo una prenotazione —
 * puntavano alla sezione prenotazioni della pagina unica: ora ha una rotta
 * sua, e da qui li si porta lì.
 */
export function PointsSection() {
  const wallet = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (window.location.hash === "#bookings") {
      router.replace("/me/prenotazioni");
    }
  }, [router]);

  return (
    <div className="space-y-14">
      {wallet.program.state === "joined" ? (
        <WalletCard wallet={wallet} />
      ) : (
        <JoinProgram
          version={wallet.program.version}
          state={wallet.program.state}
          balance={wallet.balance}
          pendingPoints={wallet.pendingPoints}
        />
      )}

      <Movements wallet={wallet} />
    </div>
  );
}
