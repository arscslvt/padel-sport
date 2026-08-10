"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { FaFacebookF, FaInstagram } from "react-icons/fa";

import {
  NAV_BAR_INSET,
  NAV_ICON_BUTTON_CLASS,
  NavPillLogo,
  navPillClass,
} from "@/components/nav-pill";
import { Button } from "@/components/ui/button";
import { getInfo } from "@/lib/info";
import {
  EVENTS_LINK,
  SHOW_TOURNAMENT_BANNER,
  TROFEO_LINK,
  WHERE_WE_ARE_LINK,
} from "@/lib/links";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

const routes: ReadonlyArray<{ name: string; href: string }> = [
  { name: "Home", href: "/" },
  { name: "Dove trovarci", href: WHERE_WE_ARE_LINK },
  { name: "Tornei ed Eventi", href: EVENTS_LINK },
];

interface NavOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Stato di scroll dell'header: serve a far combaciare le due pillole. */
  scrolled: boolean;
}

/**
 * Menu a schermo intero.
 *
 * Costruito sulle primitive Dialog di Radix invece che su Sheet: serve una sola
 * implementazione per mobile e desktop, e una tela a tutta pagina è l'unico
 * contesto in cui i link in serif gigante funzionano. Da Radix arrivano gratis
 * focus trap, chiusura con Escape, blocco dello scroll e `aria-modal`.
 */
export function NavOverlay({ open, onOpenChange, scrolled }: NavOverlayProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  // Il menu non deve sopravvivere alla navigazione che ha innescato: si chiude
  // al cambio di rotta, non al mount.
  const previousPathname = React.useRef(pathname);
  React.useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      onOpenChange(false);
    }
  }, [pathname, onOpenChange]);

  const rise = (delay: number) => ({
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    transition: {
      duration: shouldReduceMotion ? 0.15 : DURATION.fast,
      delay: shouldReduceMotion ? 0 : delay,
      ease: EASE,
    },
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="bg-background fixed inset-0 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
              >
                <VisuallyHidden.Root asChild>
                  <DialogPrimitive.Title>
                    Menu di navigazione
                  </DialogPrimitive.Title>
                </VisuallyHidden.Root>

                {/* Pillola gemella di quella dell'header: stessa geometria, ma
                    dentro il Content — quindi cliccabile e dentro il focus trap.
                    Sta fuori dall'area scrollabile, così non serve `fixed`
                    dentro un elemento animato. */}
                <div className={cn(NAV_BAR_INSET, "shrink-0")}>
                  <div className={navPillClass(scrolled)}>
                    <NavPillLogo />
                    <DialogPrimitive.Close
                      aria-label="Chiudi il menu"
                      className={NAV_ICON_BUTTON_CLASS}
                    >
                      <X className="size-5" strokeWidth={1.5} />
                    </DialogPrimitive.Close>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-12 pb-10 sm:px-10 lg:px-16">
                  <nav aria-label="Navigazione principale">
                    <ul className="flex flex-col">
                      {routes.map((route, index) => {
                        const isActive = pathname === route.href;

                        return (
                          <motion.li
                            key={route.href}
                            {...rise(0.06 + index * 0.05)}
                          >
                            <Link
                              href={route.href}
                              aria-current={isActive ? "page" : undefined}
                              className="border-border group flex items-baseline gap-4 border-b py-4 sm:gap-6 sm:py-5"
                            >
                              <span className="text-muted-foreground text-xs tabular-nums">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span
                                className={
                                  isActive
                                    ? "text-muted-foreground font-display text-[clamp(2.25rem,10vw,4.5rem)] leading-[1.05] tracking-[-0.02em]"
                                    : "font-display group-hover:text-muted-foreground text-[clamp(2.25rem,10vw,4.5rem)] leading-[1.05] tracking-[-0.02em] transition-colors"
                                }
                              >
                                {route.name}
                              </span>
                            </Link>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </nav>

                  {SHOW_TOURNAMENT_BANNER && (
                    <motion.div {...rise(0.2)} className="mt-6">
                      <Link
                        href={TROFEO_LINK}
                        className="border-border bg-muted hover:bg-accent inline-flex items-center gap-2.5 rounded-full border py-2 pr-5 pl-4 text-sm transition-colors"
                      >
                        <span className="bg-foreground size-1.5 animate-pulse rounded-full" />
                        <span>Trofeo San Sebastiano</span>
                        <span className="text-muted-foreground">
                          Regolamento e calendario.
                        </span>
                      </Link>
                    </motion.div>
                  )}

                  <motion.div
                    {...rise(0.24)}
                    className="mt-10 flex flex-col gap-2.5 sm:flex-row"
                  >
                    <Button asChild size="pill-lg" className="sm:w-auto">
                      <a href={getInfo("bookingUrl")}>Prenota una partita</a>
                    </Button>
                    <Button
                      asChild
                      size="pill-lg"
                      variant="outline"
                      className="sm:w-auto"
                    >
                      <a href={`tel:${getInfo("cell")}`}>Chiamaci</a>
                    </Button>
                  </motion.div>

                  <motion.div
                    {...rise(0.3)}
                    className="text-muted-foreground mt-auto flex flex-col gap-4 pt-12 text-sm sm:flex-row sm:items-end sm:justify-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span>{getInfo("address")}</span>
                      <a
                        href={`mailto:${getInfo("email")}`}
                        className="hover:text-foreground transition-colors"
                      >
                        {getInfo("email")}
                      </a>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        className="rounded-full"
                      >
                        <a
                          href={getInfo("instagramUrl") || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Instagram"
                        >
                          <FaInstagram className="size-5" />
                        </a>
                      </Button>
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        className="rounded-full"
                      >
                        <a
                          href={getInfo("facebookUrl") || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Facebook"
                        >
                          <FaFacebookF className="size-5" />
                        </a>
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
