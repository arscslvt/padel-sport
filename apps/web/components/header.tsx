"use client";

import { Menu } from "lucide-react";
import {
	AnimatePresence,
	motion,
	useMotionValueEvent,
	useReducedMotion,
	useScroll,
} from "motion/react";
import { usePathname } from "next/navigation";
import React from "react";

import { ImminentEventBar } from "@/components/events/imminent-event-bar";
import { NavOverlay } from "@/components/nav-overlay";
import {
	NAV_BAR_INSET,
	NAV_ICON_BUTTON_CLASS,
	NavPillLogo,
	navPillClass,
} from "@/components/nav-pill";
import { useImminentEvent } from "@/hooks/use-imminent-event";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Pillola flottante, identica su ogni rotta.
 *
 * Sopra la foto dell'hero galleggia come vetro; sulle pagine chiare è
 * bianco su bianco, e sono il bordo hairline e l'ombra lunga a staccarla dallo
 * sfondo — non vanno tolti.
 *
 * Sotto, solo in home, può spuntare la barra dell'evento imminente. Vive qui e
 * non nella pagina proprio perché l'header sopravvive al cambio di rotta: è
 * l'unico punto da cui `AnimatePresence` riesce a mostrarne anche l'uscita
 * quando si naviga altrove.
 */
export default function Header() {
	const [scrolled, setScrolled] = React.useState(false);
	const [open, setOpen] = React.useState(false);
	const shouldReduceMotion = useReducedMotion();
	const { scrollY } = useScroll();

	const pathname = usePathname();
	const isHome = pathname === "/";
	const imminentEvent = useImminentEvent(isHome);

	useMotionValueEvent(scrollY, "change", (value) => {
		setScrolled(value > 24);
	});

	return (
		<>
			{/* Sotto l'overlay: quando il menu è aperto è la sua pillola gemella a
          restare visibile e cliccabile.
          `pointer-events-none` sul contenitore perché è una fascia a tutta
          larghezza che con la barra evento diventa alta il doppio: senza,
          intercetterebbe i click sull'hero che le scorre sotto. */}
			<header
				className={cn(
					"pointer-events-none fixed inset-x-0 top-0 z-40",
					NAV_BAR_INSET,
					"flex-col items-center gap-2",
				)}
			>
				<motion.div
					initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: shouldReduceMotion ? 0.2 : DURATION.base,
						delay: shouldReduceMotion ? 0 : 0.1,
						ease: EASE,
					}}
					// `z-10`: la barra evento resta sotto nell'ordine di pittura, così
					// il backdrop-blur della pillola la sfoca mentre entra ed esce.
					className={navPillClass(
						scrolled,
						"pointer-events-auto relative z-10",
					)}
				>
					<NavPillLogo />

					<button
						type="button"
						onClick={() => setOpen(true)}
						aria-label="Apri il menu"
						aria-expanded={open}
						className={NAV_ICON_BUTTON_CLASS}
					>
						<Menu className="size-5" strokeWidth={1.5} />
					</button>
				</motion.div>

				<AnimatePresence>
					{isHome && imminentEvent && (
						<ImminentEventBar
							key={imminentEvent._id}
							event={imminentEvent}
							scrolled={scrolled}
						/>
					)}
				</AnimatePresence>
			</header>

			<NavOverlay open={open} onOpenChange={setOpen} scrolled={scrolled} />
		</>
	);
}
