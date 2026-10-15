"use client";

import {
  CalendarDays,
  Coins,
  Gift,
  type LucideIcon,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { PILL_SURFACE } from "@/components/nav-pill";
import { cn } from "@/lib/utils";

/**
 * La navigazione dell'area personale: dock in basso da telefono, colonna
 * fluttuante a sinistra da schermo largo.
 *
 * Stesso materiale della pillola dell'header (PILL_SURFACE): sono due oggetti
 * dello stesso sistema, uno che porta in giro per il sito e l'altro dentro la
 * propria area. L'unico movimento è l'indicatore della voce attiva che scivola
 * da una voce all'altra: dice «sei passato di qua», e con il movimento ridotto
 * si sposta senza animarsi.
 */

export const AREA_SECTIONS: {
  href: Route;
  label: string;
  icon: LucideIcon;
}[] = [
  { href: "/me" as Route, label: "Punti", icon: Coins },
  { href: "/me/premi" as Route, label: "Premi", icon: Gift },
  {
    href: "/me/prenotazioni" as Route,
    label: "Prenotazioni",
    icon: CalendarDays,
  },
  {
    href: "/me/segnalazioni" as Route,
    label: "Segnalazioni",
    icon: MessageSquareText,
  },
  { href: "/me/profilo" as Route, label: "Profilo", icon: UserRound },
];

/** Molla senza rimbalzo: l'indicatore arriva deciso e si ferma, non oscilla. */
const SLIDE = { type: "spring", duration: 0.35, bounce: 0 } as const;

function useActiveHref() {
  const pathname = usePathname();
  // `/me` è anche il prefisso di tutte le altre: vince la voce più lunga.
  return AREA_SECTIONS.map((section) => section.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

/**
 * Da telefono: le voci inattive sono solo icone, quella attiva si allarga in
 * una pillola con il nome. Cinque etichette intere non starebbero in 360px, e
 * il nome serve davvero solo per dire dove si è.
 */
export function AreaDock() {
  const active = useActiveHref();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  /*
   * Il dock si posa sul footer invece di coprirlo: quando il footer entra
   * nello schermo, sale insieme alla pagina di quanto il footer è salito, e
   * resta appoggiato al suo bordo. La trasformazione si scrive direttamente
   * sull'elemento, fuori da React: è un aggiornamento per ogni scroll.
   */
  useEffect(() => {
    const nav = ref.current;
    const footer = document.querySelector("footer");
    if (!nav || !footer) return;

    let frame = 0;
    const place = () => {
      frame = 0;
      const overlap = window.innerHeight - footer.getBoundingClientRect().top;
      nav.style.transform =
        overlap > 0 ? `translate3d(0, ${-overlap}px, 0)` : "";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };

    place();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Il contenuto sopra cambia altezza mentre arrivano i dati.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);

  return (
    <nav
      ref={ref}
      aria-label="Sezioni dell'area personale"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul
        className={cn(
          PILL_SURFACE,
          "pointer-events-auto flex items-center gap-1 p-1.5",
        )}
      >
        {AREA_SECTIONS.map(({ href, label, icon: Icon }) => {
          const current = href === active;

          return (
            <motion.li key={href} layout={!reduce} transition={SLIDE}>
              <Link
                href={href}
                aria-label={label}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center justify-center rounded-full outline-none",
                  "focus-visible:ring-ring/50 transition-[color,transform] duration-150 ease-out focus-visible:ring-[3px] active:scale-[0.96]",
                  current
                    ? "text-background gap-1.5 px-4"
                    : "text-muted-foreground hover:text-foreground w-11",
                )}
              >
                {current && (
                  <motion.span
                    layoutId={reduce ? undefined : "dock-active"}
                    transition={SLIDE}
                    className="bg-foreground absolute inset-0 rounded-full"
                  />
                )}
                <Icon className="relative size-[1.15rem]" strokeWidth={1.75} />
                {current && (
                  <motion.span
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: reduce ? 0 : 0.08 }}
                    className="relative text-[13px] font-medium whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Da schermo largo: una colonna che resta ferma mentre la sezione scorre, con
 * le etichette intere perché lo spazio c'è. `footer` ospita l'uscita.
 */
export function AreaRail({ footer }: { footer?: React.ReactNode }) {
  const active = useActiveHref();
  const reduce = useReducedMotion();

  return (
    <nav
      aria-label="Sezioni dell'area personale"
      className="sticky top-28 hidden self-start lg:block"
    >
      <div className={cn(PILL_SURFACE, "rounded-[1.75rem] p-2")}>
        <ul className="space-y-0.5">
          {AREA_SECTIONS.map(({ href, label, icon: Icon }) => {
            const current = href === active;

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative flex h-11 items-center gap-3 rounded-full px-4 text-sm outline-none",
                    "focus-visible:ring-ring/50 transition-[color,background-color,transform] duration-150 ease-out focus-visible:ring-[3px] active:scale-[0.98]",
                    current
                      ? "text-background"
                      : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                  )}
                >
                  {current && (
                    <motion.span
                      layoutId={reduce ? undefined : "rail-active"}
                      transition={SLIDE}
                      className="bg-foreground absolute inset-0 rounded-full"
                    />
                  )}
                  <Icon className="relative size-4" strokeWidth={1.75} />
                  <span className="relative font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {footer && (
          <div className="border-foreground/[0.07] mt-2 border-t px-2 pt-2">
            {footer}
          </div>
        )}
      </div>
    </nav>
  );
}
