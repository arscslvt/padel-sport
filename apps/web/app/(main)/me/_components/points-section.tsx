"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useWallet } from "./area-context";
import { BoostSection } from "./boost-section";
import { InviteFriend } from "./invite-friend";
import { JoinProgram } from "./join-program";
import { Movements } from "./movements";
import { LeaveProgram, LeavingNotice } from "./program-exit";
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

  const { state } = wallet.program;

  return (
    <div className="space-y-14">
      {/* Chi sta uscendo vede ancora la tessera: i punti sono suoi finché
          non scadono i dieci giorni, e deve sapere fino a quando. */}
      {state === "leaving" && <LeavingNotice wallet={wallet} />}

      {state === "joined" || state === "leaving" ? (
        <WalletCard wallet={wallet} />
      ) : (
        <JoinProgram
          version={wallet.program.version}
          state={state}
          balance={wallet.balance}
          pendingPoints={wallet.pendingPoints}
        />
      )}

      <BoostSection joined={state === "joined" || state === "leaving"} />

      <Movements wallet={wallet} />

      <InviteFriend />

      {(state === "joined" || state === "outdated") && (
        <LeaveProgram wallet={wallet} />
      )}
    </div>
  );
}
