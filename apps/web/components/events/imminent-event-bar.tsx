"use client";

import { CalendarDays, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

import { SanityImage } from "@/components/events/sanity-image";
import { MarqueeText } from "@/components/marquee-text";
import { PILL_SURFACE, PILL_WIDTH } from "@/components/nav-pill";
import { formatEventDate } from "@/lib/events";
import type { ImminentEvent } from "@/lib/imminent-event";
import { eventLink } from "@/lib/links";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Richiamo all'evento ormai alle porte, incolonnato sotto la pillola di
 * navigazione e con lo stesso vetro, ma più basso: è chiaro che è un secondo
 * livello e non un'altra barra di pari grado.
 *
 * L'ingresso parte da dietro la pillola (`y` negativa, origine in alto) e la
 * attraversa scalando e sfocando: sembra spuntare da sotto il vetro. A
 * completare l'illusione è lo `z-index` nell'header — la pillola sta sopra, e
 * il suo `backdrop-blur` sfoca davvero la barra che le passa dietro.
 */
export function ImminentEventBar({
	event,
	scrolled,
}: {
	event: ImminentEvent;
	scrolled: boolean;
}) {
	const shouldReduceMotion = useReducedMotion();
	// `formatEventDate` e non `formatCardDate`: dentro tre giorni l'ora è
	// l'informazione che conta, e il formato compatto delle card la perde
	// appena si esce da "Oggi"/"Domani".
	const dateLabel = formatEventDate(event.dateStart, event.dateEnd);

	const hidden = shouldReduceMotion
		? { opacity: 0 }
		: { opacity: 0, y: -40, scale: 0.8, filter: "blur(6px)" };

	return (
		<motion.div
			initial={hidden}
			animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
			exit={hidden}
			transition={{
				duration: shouldReduceMotion ? 0.2 : DURATION.base,
				ease: EASE,
			}}
			style={{ transformOrigin: "top center" }}
			className={cn("pointer-events-auto", PILL_WIDTH)}
		>
			<Link
				href={eventLink(event.slug)}
				aria-label={`${event.title} — ${dateLabel}`}
				className={cn(
					PILL_SURFACE,
					"flex w-full items-center gap-2.5",
					"transition-[height,padding] duration-300 ease-out",
					"focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
					scrolled ? "h-10 pr-3 pl-1" : "h-12 pr-3.5 pl-2",
				)}
			>
				{event.banner?.asset ? (
					<SanityImage
						image={event.banner}
						alt=""
						sizes="40px"
						sourceWidth={138}
						className={cn(
							"shrink-0 rounded-2xl transition-[width,height] duration-300 ease-out",
							scrolled ? "w-9 h-7" : "w-12 h-8",
						)}
					/>
				) : (
					<span
						className={cn(
							"bg-muted text-muted-foreground grid shrink-0 place-content-center rounded-[0.7rem]",
							scrolled ? "size-8" : "size-9",
						)}
					>
						<CalendarDays className="size-4" strokeWidth={1.5} />
					</span>
				)}

				{/* `min-w-0` è obbligatorio: senza, la colonna non si restringe sotto
            il titolo e il marquee non si accorge mai di essere in overflow. */}
				<span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
					<MarqueeText
						text={event.title}
						className="text-[13px] leading-tight font-medium"
					/>
					<span className="text-muted-foreground truncate text-[11px] leading-tight">
						{dateLabel}
					</span>
				</span>

				<ChevronRight
					className="text-muted-foreground size-4 shrink-0"
					strokeWidth={1.5}
				/>
			</Link>
		</motion.div>
	);
}
