"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Check, Gift, Loader2, Lock } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Heading } from "@/components/ui/heading";
import { DURATION, EASE } from "@/lib/motion";
import { pointsLabel } from "@/lib/points";
import { cn } from "@/lib/utils";

import type { WalletReward } from "./types";

/**
 * La vetrina dei premi, dal più vicino al più lontano.
 *
 * Un premio sbloccato si riconosce dall'etichetta verde e dal bottone; uno
 * ancora lontano ha il lucchetto e la sua barretta, così si capisce a colpo
 * d'occhio cosa si può prendere adesso e cosa no.
 */
export function RewardsGrid({
  rewards,
  balance,
  canRedeem,
}: {
  rewards: WalletReward[];
  balance: number;
  /** Falso finché il socio non ha accettato il regolamento in vigore. */
  canRedeem: boolean;
}) {
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<WalletReward | null>(null);

  if (rewards.length === 0) return null;

  return (
    <section aria-labelledby="rewards-title" className="space-y-6">
      <Heading as="h2" size="sub" id="rewards-title">
        Premi
      </Heading>

      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((reward, index) => (
          <motion.li
            key={reward.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
            // Al caricamento e non allo scroll: la vetrina sta subito sotto il
            // saldo, e con la soglia di `VIEWPORT` le card già sullo schermo
            // restavano invisibili finché non si scorreva un poco.
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduce ? 0.2 : DURATION.base,
              delay: reduce ? 0 : 0.15 + Math.min(index, 5) * 0.06,
              ease: EASE,
            }}
          >
            <RewardCard
              reward={reward}
              balance={balance}
              canRedeem={canRedeem}
              onRedeem={() => setSelected(reward)}
            />
          </motion.li>
        ))}
      </ul>

      <RedeemDialog reward={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function RewardCard({
  reward,
  balance,
  canRedeem,
  onRedeem,
}: {
  reward: WalletReward;
  balance: number;
  canRedeem: boolean;
  onRedeem: () => void;
}) {
  const progress = Math.min(balance / reward.cost, 1);

  return (
    <article className="group bg-muted rounded-card flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden">
        {reward.imageUrl ? (
          // biome-ignore lint/performance/noImgElement: URL firmato dello storage Convex, che next/image non conosce.
          <img
            src={reward.imageUrl}
            alt=""
            loading="lazy"
            // La foto resta quella caricata dallo staff, senza filtri: a dire
            // se il premio è sbloccato ci pensano l'etichetta e il bottone.
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="bg-background/60 text-muted-foreground flex size-full items-center justify-center">
            <Gift className="size-10" strokeWidth={1.5} />
          </div>
        )}

        <span
          className={cn(
            "absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tabular-nums backdrop-blur-md",
            reward.unlocked
              ? "bg-emerald-400 text-emerald-950"
              : "bg-background/85 text-foreground",
          )}
        >
          {reward.unlocked ? (
            <Check className="size-3.5" />
          ) : (
            <Lock className="size-3.5" />
          )}
          {pointsLabel(reward.cost)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-base font-medium">{reward.title}</h3>
        <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
          {reward.description}
        </p>

        <div className="mt-auto pt-4">
          {reward.unlocked && !canRedeem ? (
            <p className="text-muted-foreground text-xs">
              Accetta il regolamento qui sopra per riscattarlo.
            </p>
          ) : reward.unlocked ? (
            <Button
              size="pill"
              className="w-full active:scale-[0.98]"
              onClick={onRedeem}
            >
              Riscatta
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="bg-background h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-foreground/70 h-full origin-left rounded-full"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
              <p className="text-muted-foreground text-xs tabular-nums">
                Ancora {pointsLabel(reward.cost - balance)}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Conferma, poi il codice.
 *
 * Il riscatto spende punti e non si annulla da soli: per questo passa da una
 * conferma che ripete costo, scadenza e termini. Dopo, la stessa finestra
 * cambia faccia e mostra il codice da far vedere allo sportello: è il momento
 * in cui il premio diventa vero, e merita la scena.
 */
function RedeemDialog({
  reward,
  onClose,
}: {
  reward: WalletReward | null;
  onClose: () => void;
}) {
  const redeem = useMutation(api.modules.points.redemptions.redeem);
  const reduce = useReducedMotion();

  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const close = () => {
    onClose();
    // Il codice resta finché la finestra si chiude, poi si azzera per il prossimo.
    setTimeout(() => setCode(null), 200);
  };

  const confirm = async () => {
    if (!reward) return;

    setLoading(true);
    try {
      const result = await redeem({ rewardId: reward.id as Id<"rewards"> });
      setCode(result.code ?? null);
    } catch (error) {
      const message =
        error instanceof Error
          ? (error.message.match(/Uncaught Error: (.*?)(?:\n| at )/)?.[1] ??
            "Riprova fra poco.")
          : "Riprova fra poco.";

      toast.error("Premio non riscattato", { description: message });
    } finally {
      setLoading(false);
    }
  };

  const swap = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -8 },
    transition: { duration: DURATION.fast, ease: EASE },
  };

  return (
    <Dialog open={reward !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait" initial={false}>
          {code ? (
            <motion.div key="code" {...swap} className="space-y-6">
              <DialogHeader>
                <DialogTitle className="font-display text-3xl font-normal tracking-[-0.02em]">
                  È tuo.
                </DialogTitle>
                <DialogDescription>
                  Mostra questo codice allo sportello per ritirare{" "}
                  {reward?.title}. Te l'abbiamo mandato anche via mail.
                </DialogDescription>
              </DialogHeader>

              <motion.p
                initial={reduce ? false : { scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="bg-muted rounded-card py-6 text-center font-mono text-4xl font-medium tracking-[0.3em]"
              >
                {code}
              </motion.p>

              <DialogFooter>
                <Button size="pill" className="w-full" onClick={close}>
                  Fatto
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div key="confirm" {...swap} className="space-y-6">
              <DialogHeader>
                <DialogTitle className="font-display text-3xl font-normal tracking-[-0.02em]">
                  {reward?.title}
                </DialogTitle>
                <DialogDescription>
                  Riscattandolo usi {reward ? pointsLabel(reward.cost) : ""} dal
                  tuo saldo. Non si può annullare da qui.
                </DialogDescription>
              </DialogHeader>

              <dl className="bg-muted rounded-card space-y-3 p-5 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Validità</dt>
                  <dd className="mt-0.5">
                    {reward?.validityDays
                      ? `${reward.validityDays} giorni dal riscatto`
                      : "Nessuna scadenza"}
                  </dd>
                </div>
                {reward?.terms && (
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      Condizioni
                    </dt>
                    <dd className="mt-0.5 leading-relaxed">{reward.terms}</dd>
                  </div>
                )}
              </dl>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" size="pill" onClick={close}>
                  Non ora
                </Button>
                <Button
                  size="pill"
                  className="active:scale-[0.98]"
                  disabled={loading}
                  onClick={() => void confirm()}
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Riscatta
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
