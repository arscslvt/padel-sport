"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ANCHORS } from "@/lib/brand";
import { requestHref, TRIAL } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * Da telefono e tablet, la prova gratuita sempre a un pollice.
 *
 * Compare quando i tasti dell'hero escono dallo schermo verso l'alto, e si
 * ritira quando si arriva ai prezzi, al modulo o al footer: lì la stessa
 * azione c'è già, o la barra coprirebbe il fondo della pagina. Sale e scende con
 * la curva dei pannelli di iOS. Nascosta, non si può né toccare né
 * raggiungere con la tastiera.
 */
export function MobileCta() {
  const [pastHero, setPastHero] = useState(false);
  const [atTarget, setAtTarget] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    // Si ritira anche sul footer: lascia vedere il nome in fondo alla pagina.
    const targets = [
      ...[ANCHORS.pricing, ANCHORS.demo].map((id) =>
        document.getElementById(id),
      ),
      document.querySelector("footer"),
    ].filter((el): el is HTMLElement => el !== null);
    if (!hero) return;

    const heroObserver = new IntersectionObserver(([entry]) => {
      // Passato vuol dire uscito dall'alto, non ancora da raggiungere.
      setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    heroObserver.observe(hero);

    const visible = new Set<Element>();
    const targetObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setAtTarget(visible.size > 0);
    });
    for (const target of targets) targetObserver.observe(target);

    return () => {
      heroObserver.disconnect();
      targetObserver.disconnect();
    };
  }, []);

  const shown = pastHero && !atTarget;

  return (
    <div
      aria-hidden={!shown}
      inert={!shown}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 px-(--gutter-frame) pb-[max(var(--gutter-frame),env(safe-area-inset-bottom))] lg:hidden",
        "transition-[translate,opacity] duration-500 ease-(--ease-drawer) motion-reduce:transition-opacity",
        shown
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-[calc(100%+1rem)] opacity-0",
      )}
    >
      <div className="glass mx-auto flex max-w-lg items-center justify-between gap-3 rounded-full py-2 pr-2 pl-5">
        <p className="min-w-0 leading-tight">
          <span className="block text-[14px] font-semibold">
            {TRIAL.days} giorni gratis
          </span>
          <span className="block text-[12px] text-muted-foreground">
            Nessun vincolo
          </span>
        </p>
        <Link href={requestHref(TRIAL.id)} className={buttonVariants()}>
          Inizia la prova gratuita
        </Link>
      </div>
    </div>
  );
}
