import { ArrowUpRight, Clock3, MessageCircle, PhoneCall } from "lucide-react";

import { SupportFormDisclosure } from "@/components/landing/support-form-disclosure";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/ui/heading";
import { ANCHORS } from "@/lib/anchors";
import { getInfo } from "@/lib/info";
import {
	phoneSupportHref,
	SUPPORT_HOURS,
	whatsappSupportHref,
} from "@/lib/support-request";

const channels = [
	{
		icon: MessageCircle,
		label: "Scrivici su WhatsApp",
		// Il messaggio arriva già impostato: all'utente resta solo la richiesta.
		description:
			"Trovi il messaggio già pronto, aggiungi solo la tua richiesta.",
		href: whatsappSupportHref(),
		external: true,
	},
	{
		icon: PhoneCall,
		label: "Chiamaci",
		description: getInfo("cell") ?? "",
		href: phoneSupportHref(),
		external: false,
	},
] as const;

/**
 * Assistenza generica, ultima sezione della home.
 *
 * `tone-emerald` ridichiara i token sul fondo verde: dentro la banda le utility
 * basate su token (testo, bordi, bottoni) si adeguano da sole.
 */
export function SupportSection() {
	return (
		<section
			id={ANCHORS.support}
			className="tone-emerald bg-emerald-950 px-6 py-16 sm:py-24 lg:px-12 lg:py-32"
		>
			<div className="mx-auto max-w-6xl">
				<Reveal>
					<SectionHeading lead="Hai bisogno di aiuto?" accent="Parliamone." />
					<p className="text-muted-foreground mt-3 max-w-[52ch] text-sm">
						Tesseramento, orari, prenotazioni o qualsiasi altra cosa: scegli il
						canale che preferisci.
					</p>
				</Reveal>

				<div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
					<Reveal className="flex flex-col gap-3">
						{channels.map(
							({ icon: Icon, label, description, href, external }) => (
								<a
									key={label}
									href={href}
									{...(external
										? { target: "_blank", rel: "noopener noreferrer" }
										: {})}
									className="rounded-card group border-border hover:border-foreground/30 hover:bg-foreground/5 flex items-start gap-4 border p-5 transition-colors"
								>
									<Icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
									<span className="flex-1">
										<span className="flex items-center gap-1.5 font-medium">
											{label}
											<ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
										</span>
										<span className="text-muted-foreground mt-0.5 block text-sm">
											{description}
										</span>
									</span>
								</a>
							),
						)}

						<p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
							<Clock3 className="size-4 shrink-0" strokeWidth={1.5} />
							{SUPPORT_HOURS}
						</p>

						<p className="text-muted-foreground mt-4 border-t border-current/15 pt-4 text-sm">
							Preferisci scrivere? Compila il modulo: le richieste inviate da
							qui vengono lette nel minor tempo possibile.
						</p>
					</Reveal>

					{/* Il modulo poggia direttamente sul verde: un pannello dentro la
              banda sarebbe una scatola dentro una scatola. */}
					<Reveal delay={0.08}>
						<SupportFormDisclosure />
					</Reveal>
				</div>
			</div>
		</section>
	);
}
