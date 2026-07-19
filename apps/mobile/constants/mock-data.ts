/**
 * Dati mock per la Home e i flussi di prenotazione / partite aperte.
 * Verranno sostituiti dall'architettura Convex.
 */

export type JoinMode = "direct" | "request";

export interface Player {
	id: string;
	name: string;
	/** Livello di gioco (scala 1.0 – 5.0) */
	level: number;
	avatarUrl: string;
}

export interface LevelRange {
	min: number;
	max: number;
}

export interface OpenMatch {
	id: string;
	creatorId: string;
	/** Giocatori già in partita, creatore incluso */
	players: Player[];
	maxPlayers: number;
	dateISO: string;
	/** Livello di gioco richiesto per unirsi */
	requiredLevel: LevelRange;
	/** Come si entra in partita: accesso diretto o richiesta al creatore */
	joinMode: JoinMode;
	club: string;
	court?: string;
	notes?: string;
}

const avatar = (seed: string) =>
	`https://api.dicebear.com/9.x/glass/png?seed=${seed}`;

export const currentUser: Player = {
	id: "me",
	name: "Antonio",
	level: 2.3,
	avatarUrl: avatar("Sadie"),
};

const players: Record<string, Player> = {
	marco: { id: "marco", name: "Marco R.", level: 2.5, avatarUrl: avatar("Marco") },
	giulia: { id: "giulia", name: "Giulia T.", level: 3.0, avatarUrl: avatar("Giulia") },
	luca: { id: "luca", name: "Luca B.", level: 2.0, avatarUrl: avatar("Luca") },
	sara: { id: "sara", name: "Sara M.", level: 3.5, avatarUrl: avatar("Sara") },
	paolo: { id: "paolo", name: "Paolo V.", level: 1.5, avatarUrl: avatar("Paolo") },
	elena: { id: "elena", name: "Elena C.", level: 2.5, avatarUrl: avatar("Elena") },
};

function daysFromNow(days: number, hour: number, minute = 0): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	d.setHours(hour, minute, 0, 0);
	return d.toISOString();
}

export const openMatches: OpenMatch[] = [
	{
		id: "m-1",
		creatorId: "marco",
		players: [players.marco, players.luca],
		maxPlayers: 4,
		dateISO: daysFromNow(1, 18, 30),
		requiredLevel: { min: 2.0, max: 3.0 },
		joinMode: "direct",
		club: "Padel Club Milano",
		court: "Campo 2",
		notes: "Partita amichevole, si gioca anche con pioggia leggera (campo coperto).",
	},
	{
		id: "m-2",
		creatorId: "giulia",
		players: [players.giulia, players.sara, players.elena],
		maxPlayers: 4,
		dateISO: daysFromNow(2, 20, 0),
		requiredLevel: { min: 2.5, max: 3.5 },
		joinMode: "request",
		club: "Città del Padel",
		court: "Campo 5",
		notes: "Cerchiamo un quarto con un buon dritto, ritmo medio-alto.",
	},
	{
		id: "m-3",
		creatorId: "paolo",
		players: [players.paolo],
		maxPlayers: 4,
		dateISO: daysFromNow(3, 9, 0),
		requiredLevel: { min: 1.0, max: 2.0 },
		joinMode: "direct",
		club: "Padel Club Milano",
		court: "Campo 1",
		notes: "Perfetta per chi inizia: zero pressioni, solo divertimento.",
	},
	{
		id: "m-4",
		creatorId: "sara",
		players: [players.sara, players.marco],
		maxPlayers: 4,
		dateISO: daysFromNow(5, 19, 0),
		requiredLevel: { min: 3.0, max: 4.0 },
		joinMode: "request",
		club: "Urban Padel Arena",
		court: "Campo 3",
	},
];

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

/** True se il livello del giocatore rientra nel livello richiesto dalla partita. */
export function matchesPlayerLevel(
	match: OpenMatch,
	player: Player = currentUser,
): boolean {
	return (
		player.level >= match.requiredLevel.min &&
		player.level <= match.requiredLevel.max
	);
}

export function getOpenMatch(id: string): OpenMatch | undefined {
	return openMatches.find((m) => m.id === id);
}

export function getMatchCreator(match: OpenMatch): Player {
	return (
		match.players.find((p) => p.id === match.creatorId) ?? match.players[0]
	);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatMatchDay(iso: string): string {
	const date = new Date(iso);
	return capitalize(
		date.toLocaleDateString("it-IT", {
			weekday: "short",
			day: "numeric",
			month: "short",
		}),
	);
}

export function formatMatchTime(iso: string): string {
	return new Date(iso).toLocaleTimeString("it-IT", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatMatchDate(iso: string): string {
	return `${formatMatchDay(iso)} · ${formatMatchTime(iso)}`;
}

export function formatLevel(level: number): string {
	return level.toFixed(1);
}

export function formatLevelRange({ min, max }: LevelRange): string {
	return max >= 5 ? `${formatLevel(min)}+` : `${formatLevel(min)} – ${formatLevel(max)}`;
}
