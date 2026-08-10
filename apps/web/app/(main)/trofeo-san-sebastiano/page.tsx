import type { Metadata } from "next";

import LiveDot from "@/app/tournament/components/live-dot";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { TOURNAMENT_ANCHORS } from "@/lib/anchors";
import { getInfo } from "@/lib/info";
import { TOURNAMENT_LINK } from "@/lib/links";
import TournamentFloatingCta from "./tournament-floating-cta";

export const metadata: Metadata = {
	title: "1° Torneo di Padel 'Trofeo San Sebastiano'",
	description:
		"Regolamento, formula e dettagli ufficiali del 1° Torneo di Padel 'Trofeo San Sebastiano' organizzato da ASD Padel Sport Melilli.",
	alternates: {
		canonical: "/trofeo-san-sebastiano",
	},
	openGraph: {
		type: "article",
		locale: "it_IT",
		url: "https://www.asdpadelsport.com/trofeo-san-sebastiano",
		title: "1° Torneo di Padel 'Trofeo San Sebastiano'",
		description:
			"Scopri regolamento, calendario e formato del 1° Torneo di Padel 'Trofeo San Sebastiano'.",
		siteName: "ASD Padel Sport Melilli",
		images: [
			{
				url: "https://www.asdpadelsport.com/og-image.jpg",
				width: 1200,
				height: 630,
				alt: "1° Torneo di Padel 'Trofeo San Sebastiano' - ASD Padel Sport Melilli",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "1° Torneo di Padel 'Trofeo San Sebastiano'",
		description:
			"Regolamento e dettagli del torneo: gironi, fase finale e criteri di classifica.",
		images: ["https://www.asdpadelsport.com/og-image.jpg"],
	},
};

const rules = [
	{
		title: "Formato del torneo",
		content: [
			"Il torneo si articola in due fasi.",
			"Fase a gironi: le coppie saranno suddivise in gruppi e si affronteranno con formula tutti contro tutti.",
			"Fase finale: le migliori coppie classificate di ciascun girone accederanno al tabellone ad eliminazione diretta (quarti di finale, semifinali e finale).",
		],
	},
	{
		title: "Durata e campi di gioco",
		content: [
			"Il torneo si svolgerà nell'arco di circa un mese.",
			"Le partite saranno disputate sui 2 campi disponibili presso la struttura.",
			"Il calendario degli incontri sarà definito dall'organizzazione, in accordo con i giocatori, tenendo conto delle rispettive disponibilità.",
		],
		highlights: [
			"Ogni squadra potrà modificare o rinviare una sola partita. Superato tale limite, l'incontro sarà assegnato perso a tavolino con punteggio 0-3.",
			"È previsto un tempo massimo di attesa di 15 minuti: trascorso tale limite, la coppia assente perderà a tavolino.",
			"Il riscaldamento avrà una durata massima di 5 minuti.",
		],
	},
	{
		title: "Formato delle partite",
		content: [
			"Gli incontri si disputano al meglio dei 3 set, ciascuno a 6 game.",
			"Sul punteggio di 40-40 si applica la regola del killer point (punto decisivo).",
		],
		highlights: [
			"Ogni set vinto assegna 1 punto in classifica.",
			"Vittoria 3-0: 3 punti alla squadra vincente, 0 alla perdente.",
			"Vittoria 2-1: 2 punti alla squadra vincente, 1 punto alla perdente.",
			"È previsto un tempo massimo di gioco di 1 ora e 30 minuti.",
			"Se allo scadere del tempo il terzo set non è concluso, il set sarà assegnato alla coppia in vantaggio.",
			"In caso di parità, si disputerà un tie-break ai 7 punti.",
		],
	},
	{
		title: "Punteggio e classifica (fase a gironi)",
		content: [
			"La classifica dei gironi è determinata dal totale dei punti (set vinti).",
			"Criteri in caso di parità: differenza game. In caso di pari punteggio e differenza game verrà effettuato lo scontro diretto.",
		],
	},
	{
		title: "Fase finale",
		content: [
			"Accedono alla fase finale le migliori coppie classificate nei gironi (numero stabilito dall'organizzazione).",
			"Gli incontri si svolgeranno con formula ad eliminazione diretta, a partire dai quarti di finale fino alle finali per i primi 4 posti.",
		],
	},
	{
		title: "Arbitraggio e comportamento",
		content: [
			"Le partite saranno auto-arbitrate dai giocatori.",
			"È richiesto il massimo rispetto dei principi di correttezza e sportività.",
			"In caso di controversie, l'organizzazione interverrà per prendere una decisione definitiva.",
			"L'organizzazione si riserva il diritto di adottare provvedimenti disciplinari in caso di comportamenti scorretti o antisportivi.",
		],
	},
	{
		title: "Modifiche al regolamento",
		content: [
			"L'organizzazione si riserva la facoltà di apportare modifiche al presente regolamento qualora necessario per garantire il corretto svolgimento del torneo.",
		],
	},
] as const;

export default function TrofeoSanSebastianoPage() {
	const phone = getInfo("cell") ?? "";
	const whatsappRaw = getInfo("whatsapp") ?? "";
	const whatsappNumber = whatsappRaw.replace(/\D/g, "");
	const whatsappMessage = encodeURIComponent(
		"Ciao! Sono interessatə a partecipare al 1° Torneo di Padel 'Trofeo San Sebastiano'. Potete darmi maggiori informazioni su iscrizione e disponibilità?",
	);
	const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;
	const whatsappHref = whatsappNumber
		? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
		: "https://wa.me/";

	return (
		<section className="px-6 pb-20 lg:px-12">
			<div id={TOURNAMENT_ANCHORS.shell} className="mx-auto max-w-5xl">
				<header className="mb-10">
					<p className="text-muted-foreground border-border mb-6 inline-flex rounded-full border px-3 py-1 text-xs tracking-[0.18em] uppercase">
						Torneo
					</p>
					<p className="text-muted-foreground text-sm">
						A.S.D. Padel Sport Melilli
					</p>
					<Heading as="h1" size="page" className="mt-2">
						1° Torneo di Padel <em className="italic">Trofeo San Sebastiano</em>
					</Heading>
					<p className="text-muted-foreground mt-4 max-w-3xl text-pretty">
						Il torneo inaugura una nuova fase della stagione: un mese di sfide,
						gironi e finali per vivere il padel con intensità, rispetto e
						sportività.
					</p>

					<div id={TOURNAMENT_ANCHORS.ctaSource} className="mt-8">
						<Button asChild size="pill">
							<a
								href={TOURNAMENT_LINK}
								target="_blank"
								rel="noopener noreferrer"
							>
								<LiveDot /> Vedi risultati in diretta
							</a>
						</Button>
					</div>
				</header>

				<div className="grid w-full gap-2.5 md:grid-cols-2">
					{rules.map((rule, index) => (
						<Reveal
							key={rule.title}
							delay={Math.min(index, 4) * 0.05}
							className="flex"
						>
							<article className="rounded-card bg-muted flex w-full flex-col p-6 lg:p-8">
								<span className="text-muted-foreground text-xs tabular-nums">
									{String(index + 1).padStart(2, "0")}
								</span>
								<Heading as="h2" size="sub" className="mt-2">
									{rule.title}
								</Heading>
								<div className="text-muted-foreground mt-4 space-y-3 text-sm leading-relaxed">
									{rule.content.map((paragraph) => (
										<p key={paragraph}>{paragraph}</p>
									))}
									{"highlights" in rule && rule.highlights.length ? (
										<ul className="marker:text-foreground/35 list-disc space-y-2 pl-5">
											{rule.highlights.map((item: string) => (
												<li key={item}>{item}</li>
											))}
										</ul>
									) : null}
								</div>
							</article>
						</Reveal>
					))}
				</div>

				<TournamentFloatingCta
					whatsappHref={whatsappHref}
					phoneHref={phoneHref}
					sourceId={TOURNAMENT_ANCHORS.ctaSource}
					containerId={TOURNAMENT_ANCHORS.shell}
				/>
			</div>
		</section>
	);
}
