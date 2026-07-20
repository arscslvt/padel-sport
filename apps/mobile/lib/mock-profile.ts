/**
 * Dati del profilo non ancora modellati su Convex (storico partite giocate,
 * punteggio, amici, codice giocatore): generati in modo deterministico dal
 * seed dell'utente, così restano stabili fra un render e l'altro.
 *
 * TODO: sostituire con query Convex quando esisteranno le tabelle
 * `matchResults` e `friendships`. I consumatori usano solo `mockProfile()`,
 * quindi il rimpiazzo è confinato a questo file.
 */

export interface PlayedMatchMock {
	id: string;
	/** Timestamp di inizio partita (passato) */
	date: number;
	court: string;
	result: "win" | "loss";
	/** Set giocati, es. ["6-4", "3-6", "7-5"] */
	sets: string[];
	partner: string;
	opponents: [string, string];
}

export interface ProfileStatsMock {
	/** Punteggio padel complessivo (scala 1.0 – 5.0) */
	score: number;
	matchesPlayed: number;
	wins: number;
	losses: number;
	/** Partite giocate negli ultimi 30 giorni */
	monthlyMatches: number;
	friends: number;
}

export interface MockProfile {
	/** Codice giocatore mostrato nell'header */
	code: string;
	stats: ProfileStatsMock;
	history: PlayedMatchMock[];
}

const NAMES = [
	"Marco Bianchi",
	"Luca Rossi",
	"Giulia Ferrari",
	"Andrea Conti",
	"Sara Greco",
	"Davide Marino",
	"Elena Bruno",
	"Matteo Costa",
];

const COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo Centrale"];

const HISTORY_LENGTH = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

function hashSeed(seed: string): number {
	let hash = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

/** PRNG deterministico (mulberry32): stesso seed → stessa sequenza. */
function random(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const pick = <T>(items: T[], next: () => number): T =>
	items[Math.floor(next() * items.length)];

/** Punteggio di un set, coerente con l'esito (il vincitore chiude a 6 o 7). */
function setScore(won: boolean, next: () => number): string {
	const tight = next() < 0.3;
	const winner = tight ? 7 : 6;
	const loser = tight ? (next() < 0.5 ? 5 : 6) : Math.floor(next() * 5);
	return won ? `${winner}-${loser}` : `${loser}-${winner}`;
}

/**
 * Profilo dimostrativo per un giocatore. `seed` deve essere stabile per utente
 * (l'id del giocatore o dell'utente Clerk).
 */
export function mockProfile(seed: string): MockProfile {
	const next = random(hashSeed(seed));

	const history: PlayedMatchMock[] = Array.from(
		{ length: HISTORY_LENGTH },
		(_, index) => {
			const won = next() < 0.55;
			const threeSets = next() < 0.4;
			const sets = [setScore(won, next), setScore(!won, next)];
			if (threeSets) sets.push(setScore(won, next));

			// Una partita ogni 4–10 giorni andando a ritroso da oggi
			const daysAgo = 3 + index * 5 + Math.floor(next() * 5);
			const date = Date.now() - daysAgo * DAY_MS;

			const partner = pick(NAMES, next);
			const others = NAMES.filter((name) => name !== partner);
			const firstOpponent = pick(others, next);
			const secondOpponent = pick(
				others.filter((name) => name !== firstOpponent),
				next,
			);

			return {
				id: `${seed}-${index}`,
				date,
				court: pick(COURTS, next),
				result: won ? "win" : "loss",
				sets: threeSets ? sets : sets.slice(0, 2),
				partner,
				opponents: [firstOpponent, secondOpponent] as [string, string],
			};
		},
	);

	const wins = history.filter((match) => match.result === "win").length;
	const monthlyMatches = history.filter(
		(match) => match.date > Date.now() - 30 * DAY_MS,
	).length;

	return {
		code: String(hashSeed(seed) % 100000).padStart(5, "0"),
		stats: {
			// Il punteggio parte da 2.0 e sale con la percentuale di vittorie
			score:
				Math.round((2 + (wins / history.length) * 2.5 + next() * 0.3) * 10) /
				10,
			matchesPlayed: history.length,
			wins,
			losses: history.length - wins,
			monthlyMatches,
			friends: 4 + Math.floor(next() * 36),
		},
		history,
	};
}
