"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/logo";
import { TiltCard } from "@/components/ui/tilt-card";
import { DURATION, EASE } from "@/lib/motion";
import { pointsLabel } from "@/lib/points";

import type { Wallet } from "./types";

/**
 * La tessera punti, e quanto manca al prossimo premio.
 *
 * Ha le proporzioni di una carta vera (1.586:1, quelle di una tessera nel
 * portafoglio) e si piega sotto il dito (TiltCard): è l'oggetto che il socio
 * «ha in mano», non un riquadro di numeri. L'avanzamento verso il premio sta
 * fuori, accanto: sulla carta resta solo quel che ci sarebbe stampato.
 *
 * Tre movimenti, ognuno con un motivo: la tessera entra ribaltandosi al
 * primo ingresso nell'area, perché è la prima cosa da guardare; il saldo
 * conta fino al valore, perché un saldo appena cambiato deve farsi notare; la
 * barra si riempie fino a dove si è arrivati. Con il movimento ridotto tutto
 * compare già fermo.
 */

/**
 * L'ingresso vale per la visita, non per ogni passaggio da «Punti»: chi torna
 * qui da un'altra sezione la tessera l'ha già vista arrivare, e rivederla
 * ribaltarsi a ogni clic diventerebbe un'attesa.
 */
let introPlayed = false;

/** Molla con un filo di rimbalzo: la carta «atterra» sul tavolo. */
const LAND = { type: "spring", duration: 0.55, bounce: 0.15 } as const;

export function WalletCard({ wallet }: { wallet: Wallet }) {
  const reduce = useReducedMotion();
  const [intro] = useState(() => !introPlayed);

  useEffect(() => {
    introPlayed = true;
  }, []);

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
      duration: 0.7,
      ease: EASE,
      delay: intro ? 0.15 : 0,
    });
    return () => controls.stop();
  }, [wallet.balance, reduce, count, intro]);

  const animateIn = intro && !reduce;

  return (
    <section
      aria-labelledby="wallet-title"
      className="grid gap-6 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] md:items-center md:gap-10"
    >
      {/* La prospettiva sta sul contenitore: il ribaltamento d'ingresso e il
          tilt sotto il dito girano nella stessa stanza. */}
      <div style={{ perspective: 1200 }}>
        <motion.div
          initial={
            animateIn ? { opacity: 0, y: 32, rotateX: 28, scale: 0.92 } : false
          }
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={animateIn ? LAND : { duration: 0 }}
          style={{ transformOrigin: "50% 100%" }}
        >
          <TiltCard
            intro={animateIn}
            corner={22}
            className="aspect-[1.586/1] w-full"
          >
            <div className="tone-ink absolute inset-0 overflow-hidden rounded-[inherit]">
              <CourtLines />

              <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <Logo className="text-foreground h-6 w-auto" />
                  <span className="text-muted-foreground text-[11px] tracking-[0.14em] uppercase">
                    Tessera punti
                  </span>
                </div>

                <div>
                  <h2 id="wallet-title" className="sr-only">
                    Il tuo saldo
                  </h2>
                  <p className="font-display flex items-baseline gap-2.5 leading-none tracking-[-0.03em]">
                    <motion.span className="text-[clamp(3.25rem,14vw,4.5rem)] tabular-nums">
                      {rounded}
                    </motion.span>
                    <span className="text-muted-foreground text-xl italic">
                      {wallet.balance === 1 ? "punto" : "punti"}
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-3 truncate text-xs tracking-[0.08em] uppercase">
                    {wallet.fullName}
                  </p>
                </div>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      </div>

      <motion.div
        initial={animateIn ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={
          animateIn
            ? { duration: DURATION.fast, delay: 0.2, ease: EASE }
            : { duration: 0 }
        }
        className="space-y-3"
      >
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
              dalla sezione Premi.
            </p>
            <ProgressBar value={1} reduce={Boolean(reduce)} />
          </>
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">
            I premi arrivano presto. Intanto i punti che guadagni in campo
            restano tutti qui.
          </p>
        )}
      </motion.div>
    </section>
  );
}

/**
 * Il campo da padel visto dall'alto, appena accennato sul fondo della
 * tessera: rettangolo, rete al centro, le due linee del servizio. È l'unico
 * decoro della carta e dice di che club è prima ancora del logo.
 */
function CourtLines() {
  return (
    <div
      aria-hidden="true"
      className="absolute top-1/2 -right-[18%] h-[130%] w-[62%] -translate-y-1/2 rotate-[-8deg] rounded-[6px] border border-white/[0.07]"
    >
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.07]" />
      <div className="absolute inset-y-[14%] left-[22%] w-px bg-white/[0.05]" />
      <div className="absolute inset-y-[14%] right-[22%] w-px bg-white/[0.05]" />
      <div className="absolute top-1/2 right-[22%] left-[22%] h-px bg-white/[0.05]" />
    </div>
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
        className="h-full origin-left rounded-full bg-emerald-500"
        initial={{ scaleX: reduce ? value : 0 }}
        animate={{ scaleX: value }}
        transition={
          reduce
            ? { duration: 0 }
            : { type: "spring", stiffness: 120, damping: 22, delay: 0.25 }
        }
      />
    </div>
  );
}
