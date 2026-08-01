/**
 * Regole del flusso di prenotazione mobile: fasce di livello, giorni
 * prenotabili e slot orari.
 *
 * Finestre di gioco, passo degli slot e durata della partita replicano quelle
 * del flusso web (apps/web/app/(main)/book/page.tsx) e del backend
 * (packages/backend/convex/modules/openMatches/lib.ts): se cambiano lì vanno
 * allineate anche qui.
 */

export const SLOT_INTERVAL_MINUTES = 30;
export const MATCH_DURATION_MINUTES = 90;
export const MAX_PLAYERS = 4;

/** Giorni selezionabili, oggi incluso. */
export const BOOKABLE_DAYS = 7;

/** Finestre di apertura del club: la partita deve iniziare e finire dentro una. */
const PLAY_WINDOWS = [
	{ start: "09:00", end: "12:30" },
	{ start: "14:30", end: "21:30" },
] as const;

const capitalize = (value: string) =>
	value.charAt(0).toUpperCase() + value.slice(1);

function toMinutes(time: string) {
	const [hours, minutes] = time.split(":").map(Number);
	return hours * 60 + minutes;
}

function toTime(minutes: number) {
	const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
	return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*                                   Livelli                                  */
/* -------------------------------------------------------------------------- */

export interface LevelRange {
	min: number;
	max: number;
	/** Nome della fascia, mostrato accanto al range numerico. */
	label: string;
	/** Descrizione breve per aiutare chi non conosce la scala. */
	hint: string;
}

/** Fasce proposte in prenotazione: coprono l'intera scala 1.0 – 5.0. */
export const LEVEL_RANGES: LevelRange[] = [
	{
		min: 1,
		max: 1.5,
		label: "Principiante",
		hint: "Prime partite, si impara giocando.",
	},
	{
		min: 2,
		max: 2.5,
		label: "Intermedio",
		hint: "Scambi continui e colpi base sicuri.",
	},
	{
		min: 3,
		max: 3.5,
		label: "Avanzato",
		hint: "Tattica di coppia e gioco sulle pareti.",
	},
	{
		min: 4,
		max: 5,
		label: "Esperto",
		hint: "Ritmo alto, partite competitive.",
	},
];

/**
 * Fascia che contiene il livello del giocatore: è quella pre-selezionata in
 * prenotazione. Senza profilo proponiamo la fascia intermedia.
 */
export function findLevelRangeIndex(level?: number | null): number {
	if (level === undefined || level === null) return 1;

	const index = LEVEL_RANGES.findIndex(
		(range) => level >= range.min && level <= range.max,
	);
	if (index >= 0) return index;

	// Livelli fuori scala o a cavallo tra due fasce: prendiamo l'estremo vicino
	return level < LEVEL_RANGES[0].min ? 0 : LEVEL_RANGES.length - 1;
}

/* -------------------------------------------------------------------------- */
/*                                   Giorni                                   */
/* -------------------------------------------------------------------------- */

export interface BookingDay {
	/** Mezzanotte del giorno: base per comporre il timestamp della partita. */
	date: Date;
	/** "Oggi", "Domani" o il giorno della settimana abbreviato. */
	label: string;
	/** Numero del giorno nel mese. */
	dayNumber: string;
}

/** I giorni prenotabili a partire da oggi. */
export function bookableDays(from: Date = new Date()): BookingDay[] {
	return Array.from({ length: BOOKABLE_DAYS }, (_, offset) => {
		const date = new Date(from);
		date.setDate(date.getDate() + offset);
		date.setHours(0, 0, 0, 0);

		const weekday = date.toLocaleDateString("it-IT", { weekday: "short" });
		const label =
			offset === 0 ? "Oggi" : offset === 1 ? "Domani" : capitalize(weekday);

		return { date, label, dayNumber: String(date.getDate()) };
	});
}

/* -------------------------------------------------------------------------- */
/*                                    Orari                                   */
/* -------------------------------------------------------------------------- */

export interface TimeSlot {
	/** Orario di inizio, es. "18:30". */
	time: string;
	/** Minuti dalla mezzanotte: per ordinare, filtrare e raggruppare. */
	minutes: number;
}

/** Tutti gli orari di inizio della giornata, uno ogni 30 minuti. */
export const DAILY_SLOTS: TimeSlot[] = PLAY_WINDOWS.flatMap((window) => {
	const slots: TimeSlot[] = [];
	const closing = toMinutes(window.end);

	for (
		let minutes = toMinutes(window.start);
		minutes + MATCH_DURATION_MINUTES <= closing;
		minutes += SLOT_INTERVAL_MINUTES
	) {
		slots.push({ time: toTime(minutes), minutes });
	}

	return slots;
});

/**
 * Orari ancora selezionabili in un giorno: oggi escludiamo quelli già passati,
 * che il backend rifiuterebbe comunque.
 *
 * La disponibilità reale dei campi resta verificata alla conferma
 * (openMatches/create.ts): qui filtriamo solo ciò che sappiamo con certezza.
 */
export function availableSlots(day: Date, now: Date = new Date()): TimeSlot[] {
	if (day.toDateString() !== now.toDateString()) return DAILY_SLOTS;

	const nowMinutes = now.getHours() * 60 + now.getMinutes();
	return DAILY_SLOTS.filter((slot) => slot.minutes > nowMinutes);
}

export interface SlotGroup {
	title: string;
	slots: TimeSlot[];
}

/** Limiti (esclusi) delle fasce orarie usate per raggruppare gli slot. */
const SLOT_GROUPS = [
	{ title: "Mattina", until: 13 * 60 },
	{ title: "Pomeriggio", until: 18 * 60 },
	{ title: "Sera", until: 24 * 60 },
];

/** Raggruppa gli orari in mattina/pomeriggio/sera, saltando i gruppi vuoti. */
export function groupSlots(slots: TimeSlot[]): SlotGroup[] {
	return SLOT_GROUPS.map(({ title, until }, index) => ({
		title,
		slots: slots.filter(
			(slot) =>
				slot.minutes < until &&
				slot.minutes >= (SLOT_GROUPS[index - 1]?.until ?? 0),
		),
	})).filter((group) => group.slots.length > 0);
}

/** Timestamp di inizio partita dal giorno e dall'orario scelti. */
export function combineDateAndTime(day: Date, time: string): number {
	const [hours, minutes] = time.split(":").map(Number);
	const date = new Date(day);
	date.setHours(hours, minutes, 0, 0);
	return date.getTime();
}

/** "Lunedì 3 agosto", per il riepilogo. */
export function formatDayLong(date: Date): string {
	return capitalize(
		date.toLocaleDateString("it-IT", {
			weekday: "long",
			day: "numeric",
			month: "long",
		}),
	);
}

/** "18:30 – 20:00": inizio e fine della partita. */
export function formatSlotRange(time: string): string {
	return `${time} – ${toTime(toMinutes(time) + MATCH_DURATION_MINUTES)}`;
}

/** "1h 30m": durata leggibile di una partita. */
export function formatDuration(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return [hours > 0 ? `${hours}h` : null, rest > 0 ? `${rest}m` : null]
		.filter(Boolean)
		.join(" ");
}
