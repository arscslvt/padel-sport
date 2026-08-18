import type { StaticImageData } from "next/image";
import Image from "next/image";

import handshakingPlayers from "@/assets/illustrations/home/handshaking-players.webp";
import padelRacket from "@/assets/illustrations/home/padel-racket.webp";
import playingPlayer from "@/assets/illustrations/home/playing-player.webp";
import { Reveal } from "@/components/reveal";
import { Heading, SectionHeading } from "@/components/ui/heading";

const FEATURES: ReadonlyArray<{
	illustration: StaticImageData;
	alt: string;
	title: string;
	text: string;
}> = [
	{
		illustration: padelRacket,
		alt: "Racchetta da padel Padel Sport",
		title: "Gioca",
		text: "Campi pronti per il tuo prossimo match, con prenotazione semplice e veloce.",
	},
	{
		illustration: handshakingPlayers,
		alt: "Due giocatori si stringono la mano a fine partita",
		title: "Conosci",
		text: "Trova nuovi compagni di gioco e mettiti alla prova con giocatori del tuo livello.",
	},
	{
		illustration: playingPlayer,
		alt: "Giocatore che colpisce la pallina in salto",
		title: "Competi",
		text: "Tornei, eventi e sfide per trasformare ogni partita in qualcosa di più.",
	},
];

export function FeatureCards() {
	return (
		<section className="px-2 py-16 sm:px-3 sm:py-24 lg:px-4 lg:py-32">
			<Reveal>
				<SectionHeading
					lead="Più di un campo."
					accent="Una community."
					className="mb-10 px-4 sm:mb-14 lg:mb-16 lg:px-5"
				/>
			</Reveal>

			{/* Si salta il passaggio a due colonne: una terza card orfana sta peggio
          di tre card impilate. */}
			<div className="grid gap-2.5 md:grid-cols-3">
				{FEATURES.map(({ illustration, alt, title, text }, index) => (
					<Reveal key={title} delay={index * 0.07} className="flex">
						<article className="rounded-card bg-muted flex min-h-62 w-full flex-col p-6 md:min-h-96 lg:min-h-108 lg:p-9">
							{/* Le tre illustrazioni condividono la stessa altezza sorgente:
                  vincolando l'altezza restano otticamente allineate tra le card
                  nonostante le larghezze diverse. */}
							<Image
								src={illustration}
								alt={alt}
								sizes="(min-width: 1024px) 160px, (min-width: 768px) 128px, 112px"
								className="h-28 w-auto object-contain object-left md:h-32 lg:h-40"
							/>
							{/* `mt-auto` spinge il testo in basso: è questo che fa leggere
                  l'altezza generosa come intenzionale e non come spazio vuoto. */}
							<div className="mt-auto pt-12">
								<Heading as="h3" size="card">
									{title}
								</Heading>
								<p className="text-muted-foreground mt-2 max-w-[30ch] text-sm leading-relaxed">
									{text}
								</p>
							</div>
						</article>
					</Reveal>
				))}
			</div>
		</section>
	);
}
