import Link from "next/link";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

/**
 * Geometria della pillola di navigazione, condivisa fra l'header e l'overlay.
 *
 * L'overlay disegna la propria pillola invece di riusare quella dell'header:
 * un Dialog modale di Radix mette `pointer-events: none` sul body, quindi
 * qualsiasi controllo fuori dal suo Content resterebbe inerte. Con due pillole
 * sovrapposte e identiche il passaggio è invisibile, e il tasto di chiusura sta
 * dentro il focus trap.
 */

/** Riquadro della barra: il padding è il doppio del margine della cornice hero
 *  (p-2/p-3/p-4), così lo spazio fra pillola e bordi della foto è identico
 *  sopra e ai lati. Il posizionamento lo decide chi la usa. */
export const NAV_BAR_INSET =
  "flex justify-center px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8";

/**
 * Il materiale della barra: vetro traslucido, bordo hairline, ombra lunga.
 *
 * Sta in una costante perché lo condivide anche la barra dell'evento imminente
 * che le spunta da sotto: devono leggersi come lo stesso oggetto, e due copie
 * della ricetta prima o poi divergono.
 */
export const PILL_SURFACE = cn(
  "rounded-full bg-background/85 backdrop-blur-xl backdrop-saturate-150",
  "border-foreground/[0.07] border",
  "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-18px_rgb(0_0_0/0.45)]",
);

/** Larghezza comune a pillola e barra evento: restano incolonnate. */
export const PILL_WIDTH = "w-full max-w-[min(100%,24rem)]";

export function navPillClass(scrolled: boolean, className?: string) {
  return cn(
    PILL_SURFACE,
    PILL_WIDTH,
    "flex items-center justify-between",
    "transition-[height,padding] duration-300 ease-out",
    scrolled ? "h-12 pr-1.5 pl-4" : "h-14 pr-2 pl-5",
    className,
  );
}

export const NAV_ICON_BUTTON_CLASS =
  "hover:bg-foreground/5 focus-visible:ring-ring/50 grid size-9 place-content-center rounded-full transition-colors focus-visible:ring-[3px] focus-visible:outline-none";

/**
 * Logo della pillola.
 *
 * Sta qui e non nei due chiamanti perché è l'elemento che, duplicato, faceva
 * "saltare" il marchio all'apertura del menu: dimensione e correzione ottica
 * devono valere per entrambe le pillole. Il tracciato ha peso visivo maggiore
 * in alto, quindi lo `translate-y` lo riporta al centro ottico.
 */
export function NavPillLogo() {
  return (
    <Link
      href="/"
      aria-label="Torna alla home"
      className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px] focus-visible:outline-none"
    >
      <Logo className="text-foreground h-7 w-auto translate-y-0.5" />
    </Link>
  );
}
