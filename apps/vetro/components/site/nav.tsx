"use client";

import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { ANCHORS, anchor, ROUTES } from "@/lib/brand";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Come funziona", href: anchor(ANCHORS.how) },
  { label: "Funzioni", href: anchor(ANCHORS.features) },
  { label: "Vantaggi", href: anchor(ANCHORS.benefits) },
  { label: "Prezzi", href: ROUTES.pricing },
  { label: "Domande", href: anchor(ANCHORS.faq) },
] as const;

/**
 * La pillola di navigazione, sorella di quella del sito del club.
 *
 * A pagina ferma è quasi trasparente e lascia respirare l'hero. Appena si
 * scorre diventa una lastra di vetro più piena, così i titoli che le passano
 * sotto non si confondono con le voci. Lo stato cambia solo quando si passa
 * la soglia, non a ogni pixel di scroll.
 */
export function Nav() {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const pathname = usePathname();

  useMotionValueEvent(scrollY, "change", (y) => {
    const next = y > 24;
    if (next !== scrolled) setScrolled(next);
  });

  return (
    // Stessa distanza dal bordo sopra e ai lati: il margine delle superfici,
    // lo stesso delle schede e della banda verde.
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-(--gutter-frame) pt-(--gutter-frame)">
      <motion.nav
        aria-label="Principale"
        initial={
          reduce ? false : { opacity: 0, transform: "translateY(-12px)" }
        }
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: DURATION.reveal, ease: EASE_OUT, delay: 0.1 }}
        className={cn(
          "flex h-14 w-full max-w-5xl items-center justify-between rounded-full border pr-2.5 pl-4 sm:pl-5",
          "transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-(--ease-out)",
          scrolled
            ? "glass"
            : "border-transparent bg-transparent shadow-none backdrop-blur-0",
        )}
      >
        <Link
          href={ROUTES.home}
          aria-label="Vetro, home"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <Logo />
        </Link>

        <ul
          className="hidden items-center lg:flex"
          onPointerLeave={() => setHovered(null)}
        >
          {LINKS.map((link) => (
            <li key={link.href} className="relative">
              {hovered === link.href && (
                <motion.span
                  layoutId="nav-hover"
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-foreground/7"
                  transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                />
              )}
              <Link
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                onPointerEnter={() => setHovered(link.href)}
                className="relative block rounded-full px-4 py-2 text-[13.5px] text-foreground/70 outline-none transition-colors duration-160 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 aria-[current=page]:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href={anchor(ANCHORS.demo)}
          className={buttonVariants({ size: "sm" })}
        >
          Richiedi una demo
        </Link>
      </motion.nav>
    </header>
  );
}
