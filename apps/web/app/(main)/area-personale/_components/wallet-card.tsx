"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect } from "react";

import { DURATION, EASE } from "@/lib/motion";
import { pointsLabel } from "@/lib/points";

import type { Wallet } from "./types";

/**
 * Il saldo, e quanto manca al prossimo premio.
 *
 * Due animazioni, e nessuna di decoro: il numero sale fino al saldo perché un
 * saldo appena cambiato deve farsi notare, e la barra si riempie fino a dove
 * si è arrivati perché è la risposta a «quanto mi manca» detta senza leggere.
 * Con il movimento ridotto entrambi compaiono già fermi al valore giusto.
 */
export function WalletCard({ wallet }: { wallet: Wallet }) {
  const reduce = useReducedMotion();

  const count = useMotionValue(reduce ? wallet.balance : 0);
  const rounded = useTransform(count, (value) => Math.round(value));

  const progress = wallet.next
    ? Math.min(wallet.balance / wallet.next.cost, 1)
    : 1;

  useEffect(() => {
    if (reduce) {
      count.set(wallet.balance);
      return;
    }

    const controls = animate(count, wallet.balance, {
      duration: DURATION.slow * 1.5,
      ease: EASE,
    });
    return () => controls.stop();
  }, [wallet.balance, reduce, count]);

  return (
    <section
      aria-labelledby="wallet-title"
      className="tone-ink rounded-card relative overflow-hidden p-6 sm:p-8 lg:p-10"
    >
      <div className="grid gap-10 md:grid-cols-[1fr_minmax(0,22rem)] md:items-end">
        <div>
          <h2 id="wallet-title" className="text-muted-foreground text-sm">
            Il tuo saldo
          </h2>
          <p className="font-display mt-2 flex items-baseline gap-3 leading-none tracking-[-0.03em]">
            <motion.span className="text-[clamp(4.5rem,14vw,8.5rem)] tabular-nums">
              {rounded}
            </motion.span>
            <span className="text-muted-foreground text-2xl italic">
              {wallet.balance === 1 ? "punto" : "punti"}
            </span>
          </p>
        </div>

        <div className="space-y-3">
          {wallet.next ? (
            <>
              <p className="text-sm leading-relaxed">
                Ti {wallet.next.missing === 1 ? "manca" : "mancano"}{" "}
                <span className="font-medium">
                  {pointsLabel(wallet.next.missing)}
                </span>{" "}
                per <span className="font-medium">{wallet.next.title}</span>.
              </p>
              <ProgressBar value={progress} reduce={Boolean(reduce)} />
              <p className="text-muted-foreground flex justify-between text-xs tabular-nums">
                <span>{wallet.balance}</span>
                <span>{wallet.next.cost}</span>
              </p>
            </>
          ) : wallet.rewards.length > 0 ? (
            <>
              <p className="text-sm leading-relaxed">
                Hai punti per tutti i premi in vetrina. Scegli quale riscattare
                qui sotto.
              </p>
              <ProgressBar value={1} reduce={Boolean(reduce)} />
            </>
          ) : (
            <p className="text-muted-foreground text-sm leading-relaxed">
              I premi arrivano presto. Intanto i punti che guadagni in campo
              restano tutti qui.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * La barra si riempie con `scaleX` e non con la larghezza: è una
 * trasformazione, la fa la scheda grafica senza ricalcolare l'impaginazione.
 */
function ProgressBar({ value, reduce }: { value: number; reduce: boolean }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-label="Avanzamento verso il prossimo premio"
      className="bg-muted h-2.5 overflow-hidden rounded-full"
    >
      <motion.div
        className="h-full origin-left rounded-full bg-emerald-400"
        initial={{ scaleX: reduce ? value : 0 }}
        animate={{ scaleX: value }}
        transition={
          reduce
            ? { duration: 0 }
            : { type: "spring", stiffness: 70, damping: 20, delay: 0.25 }
        }
      />
    </div>
  );
}
