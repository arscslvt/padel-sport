/** Formattazione di date e livelli per partite e prenotazioni. */

export type {
	OpenMatchView,
	PlayerView,
} from "@padel-sport/backend/convex/modules/openMatches/lib";

export type JoinMode = "direct" | "request";

export const joinModeMeta: Record<
	JoinMode,
	{ label: string; description: string; icon: string }
> = {
	direct: {
		label: "Accesso libero",
		description: "Chiunque nel livello richiesto può unirsi subito.",
		icon: "bolt.fill",
	},
	request: {
		label: "Su richiesta",
		description: "Il creatore approva le richieste di partecipazione.",
		icon: "envelope.fill",
	},
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatMatchDay(timestamp: number): string {
	const date = new Date(timestamp);
	return capitalize(
		date.toLocaleDateString("it-IT", {
			weekday: "short",
			day: "numeric",
			month: "short",
		}),
	);
}

export function formatMatchTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString("it-IT", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatMatchDate(timestamp: number): string {
	return `${formatMatchDay(timestamp)} · ${formatMatchTime(timestamp)}`;
}

export function formatLevel(level: number): string {
	return level.toFixed(1);
}

export function formatLevelRange(min: number, max: number): string {
	return max >= 5
		? `${formatLevel(min)}+`
		: `${formatLevel(min)} – ${formatLevel(max)}`;
}

/** Estrae il messaggio leggibile da un errore lanciato da una mutation Convex. */
export function convexErrorMessage(error: unknown): string {
	const raw = error instanceof Error ? error.message : String(error);
	// I messaggi delle mutation arrivano come "Uncaught Error: <messaggio> at ..."
	const match = raw.match(/Uncaught Error: (.*?)(?:\n| at )/);
	return match?.[1] ?? raw;
}
