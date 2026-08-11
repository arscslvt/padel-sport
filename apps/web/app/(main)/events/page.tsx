import type { Metadata } from "next";

import { TournamentCallout } from "@/components/events/tournament-callout";
import { Heading } from "@/components/ui/heading";
import { client } from "@/sanity/client";
import { EVENTS_QUERY } from "@/sanity/queries";
import type { EventCardData } from "@/sanity/types";
import { EventsIndex } from "./events-index";

export const revalidate = 60;

export const metadata: Metadata = {
	title: "Tornei ed Eventi",
	description:
		"Tutti gli eventi, i tornei e le novità di ASD Padel Sport Melilli: cerca tra gli articoli e resta aggiornato su ciò che succede al club.",
	alternates: { canonical: "/events" },
	openGraph: {
		type: "website",
		url: "/events",
		title: "Tornei ed Eventi | Padel Sport Melilli",
		description:
			"Tutti gli eventi, i tornei e le novità di ASD Padel Sport Melilli.",
	},
};

export default async function EventsPage() {
	const events = await client.fetch<EventCardData[]>(EVENTS_QUERY);

	return (
		<div className="flex min-h-[calc(100dvh-8rem)] flex-1 flex-col px-6 lg:px-32">
			<header className="flex flex-col">
				<Heading as="h1" size="page">
					Tornei ed Eventi
				</Heading>
				<p className="text-muted-foreground max-w-[60ch] pt-3 text-sm">
					Tutto quello che succede al club: tornei, corsi e novità.
				</p>
			</header>

			<div className="flex flex-1 flex-col pt-10">
				<EventsIndex events={events} />
			</div>

			{/* Temporaneo: rimando al torneo in corso. Sta in fondo per non spingere
          gli articoli sotto la piega. Vedi TournamentCallout. */}
			<div className="pt-12 pb-20">
				<TournamentCallout />
			</div>
		</div>
	);
}
