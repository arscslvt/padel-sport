/**
 * Livelli di gioco: tre fasce condivise dal profilo (che ne salva una) e dalla
 * prenotazione (che ne richiede una).
 *
 * Il backend continua a memorizzare un numero sulla scala padel 1.0 – 5.0
 * (packages/backend/convex/tables/players.ts), quindi ogni fascia porta con sé
 * il valore rappresentativo da salvare e l'intervallo di livelli che accetta:
 * insieme coprono l'intera scala, così un profilo ricade sempre in una fascia
 * e ogni fascia è raggiungibile da qualcuno.
 */

export interface LevelRange {
	/** Livello salvato sul profilo di chi sceglie questa fascia. */
	level: number;
	min: number;
	max: number;
	label: string;
	/** Descrizione breve, per chi non conosce la scala. */
	hint: string;
}

export const LEVEL_RANGES: LevelRange[] = [
	{
		level: 1.5,
		min: 1,
		max: 1.5,
		label: "Principiante",
		hint: "Prime partite, si impara giocando.",
	},
	{
		level: 2.5,
		min: 2,
		max: 2.5,
		label: "Intermedio",
		hint: "Scambi continui e colpi base sicuri.",
	},
	{
		level: 4,
		min: 3,
		max: 5,
		label: "Avanzato",
		hint: "Tattica di coppia, pareti e ritmo alto.",
	},
];

/** Fascia che contiene il livello indicato; senza livello proponiamo la media. */
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
/*                                Questionario                                */
/* -------------------------------------------------------------------------- */

export interface QuizAnswer {
	label: string;
	/** Punti assegnati: 0 = mai fatto, 2 = padronanza. */
	score: number;
}

export interface QuizQuestion {
	question: string;
	/** Contesto per capire la domanda senza conoscere il gergo del padel. */
	hint?: string;
	answers: QuizAnswer[];
}

/**
 * Domande per chi non sa dichiarare il proprio livello: partono
 * dall'esperienza e arrivano ai colpi tecnici, così le risposte descrivono
 * cosa il giocatore sa fare in campo e non come si giudica.
 */
export const LEVEL_QUIZ: QuizQuestion[] = [
	{
		question: "Da quanto tempo giochi a padel?",
		answers: [
			{ label: "Non ho mai giocato o quasi", score: 0 },
			{ label: "Da qualche mese", score: 1 },
			{ label: "Da più di un anno, con continuità", score: 2 },
		],
	},
	{
		question: "Riesci a tenere uno scambio di dieci colpi?",
		hint: "Palleggio da fondo campo, senza forzare.",
		answers: [
			{ label: "Raramente, perdo subito la palla", score: 0 },
			{ label: "Sì, se la palla arriva comoda", score: 1 },
			{ label: "Sì, quasi sempre", score: 2 },
		],
	},
	{
		question: "Come te la cavi con le pareti?",
		hint: "La palla che rimbalza sul vetro dopo il tuo rimbalzo.",
		answers: [
			{ label: "Le evito, mi mettono in difficoltà", score: 0 },
			{ label: "Gioco l'uscita di parete se è lenta", score: 1 },
			{ label: "Le uso anche per attaccare", score: 2 },
		],
	},
	{
		question: "Con quale colpo rispondi a un pallonetto alto?",
		hint: "Quando gli avversari ti mandano la palla sopra la testa.",
		answers: [
			{ label: "La lascio rimbalzare e riparto da fondo", score: 0 },
			{ label: "Provo uno smash, ma senza controllo", score: 1 },
			{ label: "Scelgo tra bandeja e smash secondo la palla", score: 2 },
		],
	},
	{
		question: "Come vi muovete tu e il tuo compagno?",
		answers: [
			{ label: "Ognuno copre la sua metà, senza schemi", score: 0 },
			{ label: "Saliamo a rete quando capita", score: 1 },
			{ label: "Saliamo insieme e ci scambiamo i lati", score: 2 },
		],
	},
];

const MAX_QUIZ_SCORE = LEVEL_QUIZ.reduce(
	(total, question) =>
		total + Math.max(...question.answers.map((answer) => answer.score)),
	0,
);

/**
 * Fascia suggerita dal punteggio: le soglie dividono il massimo in tre,
 * con la fascia avanzata riservata a chi padroneggia quasi tutto.
 */
export function levelRangeIndexFromScore(score: number): number {
	if (score <= MAX_QUIZ_SCORE * 0.35) return 0;
	if (score < MAX_QUIZ_SCORE * 0.75) return 1;
	return 2;
}
