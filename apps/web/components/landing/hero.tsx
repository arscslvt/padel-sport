import Image from "next/image";

import heroPhoto from "@/assets/illustrations/landing-hero-illustration.webp";
import { ArticleReveal } from "@/components/events/article-reveal";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { ANCHORS, anchorHref } from "@/lib/anchors";
import { getInfo } from "@/lib/info";

export function Hero() {
	return (
		<section className="p-2 sm:p-3 lg:p-4">
			{/*
			 * `svh` e non `dvh`: con `dvh` la cornice si ridimensiona ogni volta che
			 * la toolbar di Safari mobile collassa, e il bordo arrotondato "respira".
			 */}
			<div className="rounded-frame relative isolate flex min-h-[calc(100svh-1rem)] flex-col justify-end overflow-hidden sm:min-h-[calc(100svh-1.5rem)] lg:min-h-[calc(100svh-2rem)]">
				<Image
					src={heroPhoto}
					alt="Giocatore di padel con la racchetta in mano, visto dall'alto, in campo"
					fill
					priority
					sizes="100vw"
					placeholder="blur"
					quality={90}
					className="-z-10 object-cover object-[28%_center] lg:object-center"
				/>

				{/*
				 * Il blur progressivo separa il testo dalla foto senza velarla; lo scrim
				 * a gradiente accanto garantisce il contrasto anche dove il backdrop-filter
				 * non è supportato.
				 */}
				<ProgressiveBlur
					direction="up"
					layers={6}
					blur={1}
					className="h-[58%] sm:h-[46%]"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 bottom-0 h-[65%] bg-linear-to-t from-black/65 via-black/25 to-transparent"
				/>

				<div className="tone-photo relative z-10 flex flex-col gap-8 p-6 pb-8 sm:p-9 lg:flex-row lg:items-end lg:justify-between lg:gap-20 lg:p-12">
					{/* Larghezze in rem, non in `ch`: l'occhio stretto di Instrument Serif
              rende i `ch` inaffidabili. Da lg l'interruzione è esplicita, così
              il titolo sta esattamente su due righe. */}
					<div className="max-w-76 sm:max-w-104 lg:max-w-none">
						<ArticleReveal>
							<Heading as="h1" size="hero">
								Mettersi in gioco non è
								<br className="hidden lg:block" /> mai stato così bello
							</Heading>
						</ArticleReveal>
						<ArticleReveal delay={0.08}>
							<p className="text-foreground/75 mt-4 max-w-96 text-[15px] leading-relaxed sm:text-base">
								Dal principiante al pro: da noi trovi avversari, community e
								tanto divertimento.
							</p>
						</ArticleReveal>
					</div>

					<ArticleReveal
						delay={0.16}
						className="w-full sm:max-w-sm lg:w-auto lg:min-w-64 lg:shrink-0"
					>
						<div className="flex flex-col gap-2.5">
							<Button asChild size="pill-lg" variant="onPhoto">
								<a href={getInfo("bookingUrl")}>Prenota una partita</a>
							</Button>
							<Button asChild size="pill-lg" variant="glass">
								<a href={anchorHref(ANCHORS.support)}>Contattaci</a>
							</Button>
						</div>
					</ArticleReveal>
				</div>
			</div>
		</section>
	);
}
